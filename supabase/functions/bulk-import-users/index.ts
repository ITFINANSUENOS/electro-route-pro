import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamMember {
  sede: string;
  regional: string;
  cc_asesor: string;
  codigo_asesor: string;
  nombre_asesor: string;
  movil_asesor: string;
  tipo_asesor: string;
  codigo_jefe: string;
  cc_jefe: string;
  jefe_ventas: string;
  movil_jefe: string;
  correo_jefe: string;
  cedula_lider: string;
  lider_zona: string;
  movil_lider: string;
  correo_lider: string;
  zona: string;
  cedula_coordinador: string;
  coordinador: string;
  movil_coordinador: string;
  correo_coordinador: string;
}

// Generate email from name
function generateEmail(name: string, cedula: string): string {
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .slice(0, 2)
    .join('.');
  return `${cleanName}.${cedula.slice(-4)}@electrocreditos.com`;
}

// Generate password
function generatePassword(cedula: string): string {
  return `Ecom2026$${cedula.slice(-4)}`;
}

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

    // Verify admin
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
        JSON.stringify({ error: 'Solo administradores pueden importar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: teamData }: { data: TeamMember[] } = await req.json();

    if (!teamData || !Array.isArray(teamData)) {
      return new Response(
        JSON.stringify({ error: 'Datos de equipo requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, nombre, codigo');

    const regionalMap = new Map(regionales?.map(r => [r.nombre.toUpperCase(), r.id]) || []);
    const regionalCodeMap = new Map(regionales?.map(r => [r.codigo, r.id]) || []);

    // Get existing users to avoid duplicates
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers?.users?.map(u => u.email?.toLowerCase()) || []);

    // Track unique entities
    const processedAsesores = new Set<string>();
    const processedJefes = new Set<string>();
    const processedLideres = new Set<string>();
    const processedCoordinadores = new Set<string>();

    const stats = {
      asesores_created: 0,
      jefes_created: 0,
      lideres_created: 0,
      coordinadores_created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const createdUsers: { email: string; password: string; nombre: string; role: string }[] = [];

    for (const member of teamData) {
      try {
        const zona = member.zona?.toLowerCase() || null;
        const sedeCode = parseInt(member.sede) || null;
        const regionalId = regionalMap.get(member.regional?.toUpperCase()) || 
                          (sedeCode ? regionalCodeMap.get(sedeCode) : null);

        // 1. Process Asesor
        if (member.cc_asesor && member.codigo_asesor && !processedAsesores.has(member.cc_asesor)) {
          processedAsesores.add(member.cc_asesor);
          
          const email = generateEmail(member.nombre_asesor, member.cc_asesor);
          const password = generatePassword(member.cc_asesor);

          if (!existingEmails.has(email.toLowerCase())) {
            try {
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { cedula: member.cc_asesor, nombre_completo: member.nombre_asesor }
              });

              if (createError) {
                stats.errors.push(`Asesor ${member.cc_asesor}: ${createError.message}`);
              } else if (newUser?.user) {
                // Create profile
                await supabaseAdmin.from('profiles').insert({
                  user_id: newUser.user.id,
                  cedula: member.cc_asesor,
                  nombre_completo: member.nombre_asesor,
                  telefono: member.movil_asesor || null,
                  codigo_asesor: member.codigo_asesor,
                  codigo_jefe: member.codigo_jefe !== 'N/A' ? member.codigo_jefe : null,
                  tipo_asesor: member.tipo_asesor || null,
                  ccosto_asesor: member.sede || null,
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: email
                });

                // Assign role
                await supabaseAdmin.from('user_roles').insert({
                  user_id: newUser.user.id,
                  role: 'asesor_comercial'
                });

                stats.asesores_created++;
                createdUsers.push({ email, password, nombre: member.nombre_asesor, role: 'asesor_comercial' });
                existingEmails.add(email.toLowerCase());
              }
            } catch (e) {
              stats.errors.push(`Asesor ${member.cc_asesor}: ${e instanceof Error ? e.message : 'Error'}`);
            }
          } else {
            stats.skipped++;
          }
        }

        // 2. Process Jefe de Ventas
        if (member.cc_jefe && member.cc_jefe !== 'N/A' && member.codigo_jefe !== 'N/A' && 
            !processedJefes.has(member.cc_jefe)) {
          processedJefes.add(member.cc_jefe);

          // Insert into jefes_ventas table
          await supabaseAdmin.from('jefes_ventas').upsert({
            cedula: member.cc_jefe,
            codigo: member.codigo_jefe,
            nombre: member.jefe_ventas,
            telefono: member.movil_jefe || null,
            correo: member.correo_jefe?.replace(/\\/g, '') || null,
            regional_id: regionalId,
            activo: true
          }, { onConflict: 'cedula' });

          // Create auth user for jefe
          const jefeEmail = member.correo_jefe?.replace(/\\/g, '') || generateEmail(member.jefe_ventas, member.cc_jefe);
          const jefePassword = generatePassword(member.cc_jefe);

          if (!existingEmails.has(jefeEmail.toLowerCase())) {
            try {
              const { data: newJefe, error: jefeError } = await supabaseAdmin.auth.admin.createUser({
                email: jefeEmail,
                password: jefePassword,
                email_confirm: true,
                user_metadata: { cedula: member.cc_jefe, nombre_completo: member.jefe_ventas }
              });

              if (!jefeError && newJefe?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newJefe.user.id,
                  cedula: member.cc_jefe,
                  nombre_completo: member.jefe_ventas,
                  telefono: member.movil_jefe || null,
                  codigo_jefe: member.codigo_jefe,
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: jefeEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newJefe.user.id,
                  role: 'jefe_ventas'
                });

                stats.jefes_created++;
                createdUsers.push({ email: jefeEmail, password: jefePassword, nombre: member.jefe_ventas, role: 'jefe_ventas' });
                existingEmails.add(jefeEmail.toLowerCase());
              }
            } catch (e) {
              // Jefe may already exist, skip
            }
          }
        }

        // 3. Process Líder de Zona
        if (member.cedula_lider && member.cedula_lider !== 'N/A' && member.lider_zona &&
            !processedLideres.has(member.cedula_lider)) {
          processedLideres.add(member.cedula_lider);

          // Insert into lideres_zona table
          await supabaseAdmin.from('lideres_zona').upsert({
            cedula: member.cedula_lider,
            nombre: member.lider_zona,
            telefono: member.movil_lider || null,
            correo: member.correo_lider?.replace(/[<>]/g, '') || null,
            zona: zona,
            regional_id: regionalId,
            activo: true
          }, { onConflict: 'cedula' });

          // Create auth user for lider
          const liderEmail = member.correo_lider?.replace(/[<>]/g, '') || generateEmail(member.lider_zona, member.cedula_lider);
          const liderPassword = generatePassword(member.cedula_lider);

          if (!existingEmails.has(liderEmail.toLowerCase())) {
            try {
              const { data: newLider, error: liderError } = await supabaseAdmin.auth.admin.createUser({
                email: liderEmail,
                password: liderPassword,
                email_confirm: true,
                user_metadata: { cedula: member.cedula_lider, nombre_completo: member.lider_zona }
              });

              if (!liderError && newLider?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newLider.user.id,
                  cedula: member.cedula_lider,
                  nombre_completo: member.lider_zona,
                  telefono: member.movil_lider || null,
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: liderEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newLider.user.id,
                  role: 'lider_zona'
                });

                // Link to lideres_zona table
                await supabaseAdmin.from('lideres_zona')
                  .update({ user_id: newLider.user.id })
                  .eq('cedula', member.cedula_lider);

                stats.lideres_created++;
                createdUsers.push({ email: liderEmail, password: liderPassword, nombre: member.lider_zona, role: 'lider_zona' });
                existingEmails.add(liderEmail.toLowerCase());
              }
            } catch (e) {
              // Lider may already exist, skip
            }
          }
        }

        // 4. Process Coordinador
        if (member.cedula_coordinador && member.cedula_coordinador !== 'N/A' && member.coordinador &&
            !processedCoordinadores.has(member.cedula_coordinador)) {
          processedCoordinadores.add(member.cedula_coordinador);

          // Insert into coordinadores table
          await supabaseAdmin.from('coordinadores').upsert({
            cedula: member.cedula_coordinador,
            nombre: member.coordinador,
            telefono: member.movil_coordinador || null,
            correo: member.correo_coordinador?.replace(/\\/g, '') || null,
            zona: zona,
            activo: true
          }, { onConflict: 'cedula' });

          // Create auth user for coordinador
          const coordEmail = member.correo_coordinador?.replace(/\\/g, '') || generateEmail(member.coordinador, member.cedula_coordinador);
          const coordPassword = generatePassword(member.cedula_coordinador);

          if (!existingEmails.has(coordEmail.toLowerCase())) {
            try {
              const { data: newCoord, error: coordError } = await supabaseAdmin.auth.admin.createUser({
                email: coordEmail,
                password: coordPassword,
                email_confirm: true,
                user_metadata: { cedula: member.cedula_coordinador, nombre_completo: member.coordinador }
              });

              if (!coordError && newCoord?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newCoord.user.id,
                  cedula: member.cedula_coordinador,
                  nombre_completo: member.coordinador,
                  telefono: member.movil_coordinador || null,
                  zona: zona,
                  activo: true,
                  correo: coordEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newCoord.user.id,
                  role: 'coordinador_comercial'
                });

                // Link to coordinadores table
                await supabaseAdmin.from('coordinadores')
                  .update({ user_id: newCoord.user.id })
                  .eq('cedula', member.cedula_coordinador);

                stats.coordinadores_created++;
                createdUsers.push({ email: coordEmail, password: coordPassword, nombre: member.coordinador, role: 'coordinador_comercial' });
                existingEmails.add(coordEmail.toLowerCase());
              }
            } catch (e) {
              // Coordinador may already exist, skip
            }
          }
        }

      } catch (err) {
        stats.errors.push(`Error general: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }

    const totalCreated = stats.asesores_created + stats.jefes_created + stats.lideres_created + stats.coordinadores_created;

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        created_users: createdUsers.slice(0, 50), // Return first 50 for reference
        message: `Importación completada: ${stats.asesores_created} asesores, ${stats.jefes_created} jefes, ${stats.lideres_created} líderes, ${stats.coordinadores_created} coordinadores. Total: ${totalCreated} usuarios creados, ${stats.skipped} omitidos.`
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
