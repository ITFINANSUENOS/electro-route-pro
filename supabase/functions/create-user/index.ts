import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic error messages - avoid exposing internal details
const GENERIC_ERRORS = {
  VALIDATION: 'Datos de entrada inválidos',
  AUTH: 'Error de autenticación',
  PERMISSION: 'Permisos insuficientes',
  SERVER: 'Error procesando la solicitud',
  DUPLICATE: 'El usuario ya existe',
};

// Field limits
const MAX_LENGTHS = {
  nombre: 200,
  email: 254,
  telefono: 20,
  cedula: 15,
};

// Validate email
function validateEmail(email: string): boolean {
  if (!email || email.length > MAX_LENGTHS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validate cedula
function validateCedula(cedula: string): boolean {
  if (!cedula || cedula.length > MAX_LENGTHS.cedula) return false;
  return /^\d{5,12}$/.test(cedula.trim());
}

// Sanitize field
function sanitizeField(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  let trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    trimmed = "'" + trimmed;
  }
  return trimmed.slice(0, maxLength);
}

interface CreateUserRequest {
  email: string;
  password: string;
  cedula: string;
  nombre_completo: string;
  telefono?: string;
  zona?: 'norte' | 'sur' | 'centro' | 'oriente';
  role: 'asesor_comercial' | 'jefe_ventas' | 'lider_zona' | 'coordinador_comercial' | 'administrativo' | 'administrador';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleData?.role !== 'administrador') {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.PERMISSION }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { email, password, cedula, nombre_completo, telefono, zona, role } = body;

    // Validate required fields
    if (!email || !password || !cedula || !nombre_completo || !role) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate cedula format
    if (!validateCedula(cedula)) {
      return new Response(
        JSON.stringify({ error: 'Formato de cédula inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize fields
    const sanitizedNombre = sanitizeField(nombre_completo, MAX_LENGTHS.nombre);
    const sanitizedTelefono = telefono ? sanitizeField(telefono, MAX_LENGTHS.telefono) : null;

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        cedula: cedula.trim(),
        nombre_completo: sanitizedNombre,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError.message);
      // Return generic error, don't expose internal details
      if (createError.message.includes('already') || createError.message.includes('duplicate')) {
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.DUPLICATE }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        cedula: cedula.trim(),
        nombre_completo: sanitizedNombre,
        telefono: sanitizedTelefono,
        zona,
        activo: true
      });

    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role
      });

    if (roleError) {
      console.error('Error assigning role:', roleError.message);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          cedula: cedula.trim(),
          nombre_completo: sanitizedNombre,
          role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-user:', error);
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
