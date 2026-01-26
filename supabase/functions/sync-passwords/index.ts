import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserCredential {
  cedula: string;
  correo: string;
  password: string;
  nombre: string;
  rol: string;
  zona: string;
}

// Role mapping
const ROLE_MAP: Record<string, string> = {
  'ASESOR': 'asesor_comercial',
  'JEFE DE VENTAS': 'jefe_ventas',
  'LÍDER DE ZONA': 'lider_zona',
  'LIDER DE ZONA': 'lider_zona',
  'COORDINADOR COMERCIAL': 'coordinador_comercial',
  'COORDINADOR': 'coordinador_comercial',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleData?.role !== 'administrador') {
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden ejecutar la sincronización' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { users }: { users: UserCredential[] } = await req.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere el array de usuarios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, nombre, codigo');

    const regionalMap = new Map<string, string>();
    regionales?.forEach(r => {
      regionalMap.set(r.nombre.toUpperCase(), r.id);
      // Map variations
      if (r.nombre.toUpperCase() === 'CALI') regionalMap.set('VALLE', r.id);
      if (r.nombre.toUpperCase() === 'PASTO') regionalMap.set('SUR', r.id);
    });

    const stats = {
      updated: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    console.log(`Processing ${users.length} users for password sync...`);

    for (const user of users) {
      try {
        const cedula = user.cedula?.toString().trim();
        const password = user.password?.trim();
        const nombre = user.nombre?.trim();
        const rolOriginal = user.rol?.trim().toUpperCase();
        const rol = ROLE_MAP[rolOriginal] || 'asesor_comercial';
        const zona = user.zona?.trim().toUpperCase() || '';
        
        if (!cedula || !password || !nombre) {
          stats.skipped++;
          continue;
        }

        // Determine email: use provided correo or generate from cedula
        const correo = user.correo?.trim().toLowerCase() || `${cedula}@electrocreditos.com`;
        const regionalId = regionalMap.get(zona) || null;

        // Check if auth user exists with this email
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuth = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === correo);

        if (existingAuth) {
          // Update password for existing user
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, {
            password: password,
            email_confirm: true,
          });

          if (updateError) {
            stats.errors.push(`${cedula}: ${updateError.message}`);
            continue;
          }

          // Update profile
          await supabaseAdmin.from('profiles')
            .update({
              nombre_completo: nombre,
              activo: true,
              correo: correo,
              zona: zona.toLowerCase() || null,
              regional_id: regionalId,
            })
            .eq('user_id', existingAuth.id);

          // Update role if needed
          await supabaseAdmin.from('user_roles')
            .update({ role: rol })
            .eq('user_id', existingAuth.id);

          stats.updated++;
          console.log(`Updated password for: ${correo}`);
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: correo,
            password: password,
            email_confirm: true,
            user_metadata: { cedula, nombre_completo: nombre }
          });

          if (createError) {
            stats.errors.push(`${cedula}: ${createError.message}`);
            continue;
          }

          if (newUser?.user) {
            // Check if profile exists by cedula
            const { data: existingProfile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('cedula', cedula)
              .maybeSingle();

            if (existingProfile) {
              // Update existing profile with new user_id
              await supabaseAdmin.from('profiles')
                .update({
                  user_id: newUser.user.id,
                  nombre_completo: nombre,
                  activo: true,
                  correo: correo,
                  zona: zona.toLowerCase() || null,
                  regional_id: regionalId,
                })
                .eq('cedula', cedula);
            } else {
              // Create new profile
              await supabaseAdmin.from('profiles').insert({
                user_id: newUser.user.id,
                cedula: cedula,
                nombre_completo: nombre,
                activo: true,
                correo: correo,
                zona: zona.toLowerCase() || null,
                regional_id: regionalId,
              });
            }

            // Create role
            await supabaseAdmin.from('user_roles').insert({
              user_id: newUser.user.id,
              role: rol,
            });

            stats.created++;
            console.log(`Created user: ${correo}`);
          }
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        stats.errors.push(`Error: ${msg}`);
      }
    }

    console.log(`Sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Sincronización completada: ${stats.created} creados, ${stats.updated} actualizados, ${stats.skipped} omitidos.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error in sync-passwords:', errorMessage);
    return new Response(
      JSON.stringify({ error: `Error interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
