import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GENERIC_ERRORS, sanitizeErrorMessage } from "../_shared/security-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  password: string;
  cedula: string;
  nombre_completo: string;
  telefono?: string;
  zona?: string;
  role: 'asesor_comercial' | 'jefe_ventas' | 'lider_zona' | 'coordinador_comercial' | 'administrativo' | 'administrador';
  codigo_asesor?: string;
  codigo_jefe?: string;
  tipo_asesor?: 'INTERNO' | 'EXTERNO';
  regional_codigo?: number;
}

// Test users are now passed via request body for security
// This prevents hardcoded credentials in source code

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Claims verification failed:', sanitizeErrorMessage(claimsError));
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    
    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'administrador')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Admin role check failed:', sanitizeErrorMessage(roleError));
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.PERMISSION }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse test users from request body (no longer hardcoded)
    const body = await req.json().catch(() => ({}));
    const testUsers: TestUser[] = body.users || [];

    if (!testUsers.length) {
      return new Response(
        JSON.stringify({ error: 'No test users provided in request body. Expected: { users: [...] }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin operations
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

    // First get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, codigo');

    const regionalMap = new Map(regionales?.map(r => [r.codigo, r.id]) || []);

    const createdUsers: { email: string; password: string; role: string; nombre: string; status: string }[] = [];
    const errors: string[] = [];

    for (const user of testUsers) {
      try {
        // Check if user already exists by searching with email filter
        const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });
        
        const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === user.email.toLowerCase());

        if (existingUser) {
          // Update password using updateUserById
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: user.password,
            email_confirm: true
          });

          if (updateError) {
            errors.push(`${user.email} (password update): ${updateError.message}`);
          }

          // Update profile with new data
          await supabaseAdmin
            .from('profiles')
            .update({
              cedula: user.cedula,
              nombre_completo: user.nombre_completo,
              telefono: user.telefono,
              zona: user.zona,
              codigo_asesor: user.codigo_asesor,
              codigo_jefe: user.codigo_jefe,
              tipo_asesor: user.tipo_asesor,
              regional_id: user.regional_codigo ? regionalMap.get(user.regional_codigo) : null,
              correo: user.email
            })
            .eq('user_id', existingUser.id);

          createdUsers.push({ 
            email: user.email, 
            password: user.password,
            role: user.role, 
            nombre: user.nombre_completo,
            status: updateError ? 'error_password' : 'actualizado' 
          });
          continue;
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            cedula: user.cedula,
            nombre_completo: user.nombre_completo,
          }
        });

        if (createError) {
          errors.push(`${user.email}: ${createError.message}`);
          continue;
        }

        // Create profile with all fields
        const profileData: Record<string, unknown> = {
          user_id: newUser.user.id,
          cedula: user.cedula,
          nombre_completo: user.nombre_completo,
          telefono: user.telefono,
          activo: true,
          correo: user.email
        };
        
        if (user.zona) profileData.zona = user.zona;
        if (user.codigo_asesor) profileData.codigo_asesor = user.codigo_asesor;
        if (user.codigo_jefe) profileData.codigo_jefe = user.codigo_jefe;
        if (user.tipo_asesor) profileData.tipo_asesor = user.tipo_asesor;
        if (user.regional_codigo) profileData.regional_id = regionalMap.get(user.regional_codigo);

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          errors.push(`${user.email} (perfil): ${profileError.message}`);
          continue;
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: user.role
          });

        if (roleError) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          errors.push(`${user.email} (rol): ${roleError.message}`);
          continue;
        }

        // Update lideres_zona table if this is a lider
        if (user.role === 'lider_zona') {
          await supabaseAdmin
            .from('lideres_zona')
            .update({ user_id: newUser.user.id })
            .eq('cedula', user.cedula);
        }

        // Update coordinadores table if this is a coordinador
        if (user.role === 'coordinador_comercial') {
          await supabaseAdmin
            .from('coordinadores')
            .update({ user_id: newUser.user.id })
            .eq('cedula', user.cedula);
        }

        createdUsers.push({ 
          email: user.email, 
          password: user.password,
          role: user.role, 
          nombre: user.nombre_completo,
          status: 'creado' 
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`${user.email}: ${errorMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se procesaron ${createdUsers.length} usuarios`,
        users: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: `Error interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
