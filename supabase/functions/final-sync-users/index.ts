import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserRecord {
  cedula: string;
  correo: string;
  password: string;
  nombre: string;
  rol: string;
  zona: string;
}

// 6 asesores a desactivar explícitamente
const CEDULAS_DESACTIVAR = [
  '10544234',   // DORADO TOBAR OSCAR GERARDO
  '29973085',   // ROMERO SANCHEZ MILEYDI MARIA
  '59819181',   // PEREZ ROSERO GLORIA MARLENE
  '1006101281', // BUITRON LOSADA DARLY VANESSA
  '1085931083', // GUZMAN CUASQUER HERNEY OSMANY
  '87062784',   // UNIGARRO ORTEGA HAROLD DANIEL (Líder Tuquerres vacante)
];

// Protected accounts that should not be modified
const PROTECTED_ACCOUNTS = [
  'admin@electrocreditos.com',
  'administrativo@electrocreditos.com',
];

// Generate password: first letter of last name (uppercase) + cedula
function generatePassword(nombre: string, cedula: string): string {
  const parts = nombre.trim().split(/\s+/);
  // Names are in format "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2" or "APELLIDO NOMBRE"
  const firstLastName = parts[0] || '';
  const firstLetter = firstLastName.charAt(0).toUpperCase();
  return `${firstLetter}${cedula}`;
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

    const { users }: { users: UserRecord[] } = await req.json();

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
      // Map common variations
      if (r.nombre.toUpperCase() === 'CALI') regionalMap.set('VALLE', r.id);
      if (r.nombre.toUpperCase() === 'PASTO') regionalMap.set('SUR', r.id);
    });

    // Get existing users and profiles
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, cedula, activo, correo');

    const existingCedulaMap = new Map(existingProfiles?.map(p => [p.cedula, p]) || []);
    
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmailMap = new Map(existingAuthUsers?.users?.map(u => [u.email?.toLowerCase(), u]) || []);

    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      deactivated: 0,
      errors: [] as string[],
    };

    const createdUsers: { cedula: string; correo: string; nombre: string; rol: string }[] = [];

    console.log(`Processing ${users.length} users...`);

    // Process each user
    for (const user of users) {
      try {
        const cedula = user.cedula?.toString().trim();
        const nombre = user.nombre?.trim();
        const rolOriginal = user.rol?.trim().toUpperCase();
        const rol = ROLE_MAP[rolOriginal] || 'asesor_comercial';
        const zona = user.zona?.trim().toUpperCase() || 'NORTE';
        
        if (!cedula || !nombre) {
          stats.skipped++;
          continue;
        }

        // Check if this cedula should be deactivated
        if (CEDULAS_DESACTIVAR.includes(cedula)) {
          const existingProfile = existingCedulaMap.get(cedula);
          if (existingProfile) {
            await supabaseAdmin.from('profiles')
              .update({ activo: false })
              .eq('cedula', cedula);
            stats.deactivated++;
          }
          continue;
        }

        // Generate email and password
        const correo = user.correo?.trim().toLowerCase() || `${cedula}@electrocreditos.com`;
        const password = generatePassword(nombre, cedula);
        const regionalId = regionalMap.get(zona) || null;

        // Check if user exists by cedula
        const existingProfile = existingCedulaMap.get(cedula);
        const existingAuth = existingEmailMap.get(correo);

        if (existingProfile && existingAuth) {
          // Update existing user
          await supabaseAdmin.from('profiles')
            .update({
              nombre_completo: nombre,
              activo: true,
              correo: correo,
              zona: zona.toLowerCase(),
              regional_id: regionalId,
            })
            .eq('cedula', cedula);

          // Update password
          await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, {
            password: password,
            email_confirm: true,
          });

          stats.updated++;
        } else if (!existingAuth) {
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
            // Check if profile exists (created user with different email)
            if (existingProfile) {
              // Update existing profile with new user_id
              await supabaseAdmin.from('profiles')
                .update({
                  user_id: newUser.user.id,
                  nombre_completo: nombre,
                  activo: true,
                  correo: correo,
                  zona: zona.toLowerCase(),
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
                zona: zona.toLowerCase(),
                regional_id: regionalId,
              });
            }

            // Create or update role
            const { data: existingRole } = await supabaseAdmin
              .from('user_roles')
              .select('id')
              .eq('user_id', newUser.user.id)
              .maybeSingle();

            if (existingRole) {
              await supabaseAdmin.from('user_roles')
                .update({ role: rol })
                .eq('user_id', newUser.user.id);
            } else {
              await supabaseAdmin.from('user_roles').insert({
                user_id: newUser.user.id,
                role: rol,
              });
            }

            stats.created++;
            createdUsers.push({ cedula, correo, nombre, rol });
          }
        } else {
          stats.skipped++;
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        stats.errors.push(`Error: ${msg}`);
      }
    }

    // Deactivate users in CEDULAS_DESACTIVAR that might not have been in the list
    for (const cedula of CEDULAS_DESACTIVAR) {
      await supabaseAdmin.from('profiles')
        .update({ activo: false })
        .eq('cedula', cedula);
      
      await supabaseAdmin.from('lideres_zona')
        .update({ activo: false })
        .eq('cedula', cedula);
    }

    console.log(`Sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.deactivated} deactivated`);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        created_users: createdUsers,
        message: `Sincronización completada: ${stats.created} creados, ${stats.updated} actualizados, ${stats.deactivated} desactivados, ${stats.skipped} omitidos.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error in final-sync-users:', errorMessage);
    return new Response(
      JSON.stringify({ error: `Error interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
