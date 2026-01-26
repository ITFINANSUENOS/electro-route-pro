import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-secret',
};

// Generic error messages - avoid exposing internal details
const GENERIC_ERRORS = {
  DB_ERROR: 'Error de base de datos',
  CREATE_ERROR: 'Error creando cuenta de administrador',
  AUTH_ERROR: 'Error de autenticación',
  VALIDATION: 'Datos de entrada inválidos',
  ALREADY_EXISTS: 'Ya existe un administrador. Usa el login normal.',
  BOOTSTRAP_DISABLED: 'Bootstrap no disponible',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Require bootstrap secret if configured
    const BOOTSTRAP_SECRET = Deno.env.get('BOOTSTRAP_SECRET');
    if (BOOTSTRAP_SECRET) {
      const providedSecret = req.headers.get('X-Bootstrap-Secret');
      if (providedSecret !== BOOTSTRAP_SECRET) {
        console.error('Bootstrap attempt with invalid secret');
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.BOOTSTRAP_DISABLED }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'administrador')
      .limit(1);

    if (checkError) {
      console.error('Bootstrap check error:', checkError.message);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.DB_ERROR }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.ALREADY_EXISTS }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { email, password, cedula, nombre_completo } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        cedula: cedula || 'ADMIN-001',
        nombre_completo: nombre_completo || 'Administrador del Sistema',
      }
    });

    if (createError) {
      console.error('Bootstrap create user error:', createError.message);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.CREATE_ERROR }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        cedula: cedula || 'ADMIN-001',
        nombre_completo: nombre_completo || 'Administrador del Sistema',
        activo: true
      });

    if (profileError) {
      console.error('Bootstrap create profile error:', profileError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.CREATE_ERROR }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'administrador'
      });

    if (roleError) {
      console.error('Bootstrap assign role error:', roleError.message);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.CREATE_ERROR }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Bootstrap admin created successfully:', {
      email: newUser.user.email,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Administrador creado exitosamente!',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: 'administrador'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Bootstrap internal error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.CREATE_ERROR }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
