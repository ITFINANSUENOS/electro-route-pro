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
        JSON.stringify({ error: 'Solo administradores pueden importar datos' }),
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

    // Track unique entities to avoid duplicates
    const processedJefes = new Set<string>();
    const processedLideres = new Set<string>();
    const processedCoordinadores = new Set<string>();

    const stats = {
      jefes_created: 0,
      lideres_created: 0,
      coordinadores_created: 0,
      profiles_updated: 0,
      errors: [] as string[]
    };

    for (const member of teamData) {
      try {
        const regionalId = regionalMap.get(member.regional?.toUpperCase());
        const zona = member.zona?.toLowerCase() || null;

        // Process Jefe de Ventas (if valid)
        if (member.codigo_jefe && member.codigo_jefe !== 'N/A' && member.cc_jefe && member.cc_jefe !== 'N/A') {
          const jefeKey = member.cc_jefe;
          if (!processedJefes.has(jefeKey)) {
            processedJefes.add(jefeKey);
            
            const { error: jefeError } = await supabaseAdmin
              .from('jefes_ventas')
              .upsert({
                cedula: member.cc_jefe,
                codigo: member.codigo_jefe,
                nombre: member.jefe_ventas || '',
                telefono: member.movil_jefe || null,
                correo: member.correo_jefe || null,
                regional_id: regionalId || null,
                activo: true
              }, { onConflict: 'cedula' });

            if (jefeError) {
              stats.errors.push(`Jefe ${member.cc_jefe}: ${jefeError.message}`);
            } else {
              stats.jefes_created++;
            }
          }
        }

        // Process Líder de Zona (if valid)
        if (member.cedula_lider && member.cedula_lider !== 'N/A' && member.lider_zona) {
          const liderKey = member.cedula_lider;
          if (!processedLideres.has(liderKey)) {
            processedLideres.add(liderKey);
            
            const { error: liderError } = await supabaseAdmin
              .from('lideres_zona')
              .upsert({
                cedula: member.cedula_lider,
                nombre: member.lider_zona,
                telefono: member.movil_lider || null,
                correo: member.correo_lider || null,
                zona: zona,
                regional_id: regionalId || null,
                activo: true
              }, { onConflict: 'cedula' });

            if (liderError) {
              stats.errors.push(`Líder ${member.cedula_lider}: ${liderError.message}`);
            } else {
              stats.lideres_created++;
            }
          }
        }

        // Process Coordinador (if valid)
        if (member.cedula_coordinador && member.cedula_coordinador !== 'N/A' && member.coordinador) {
          const coordKey = member.cedula_coordinador;
          if (!processedCoordinadores.has(coordKey)) {
            processedCoordinadores.add(coordKey);
            
            const { error: coordError } = await supabaseAdmin
              .from('coordinadores')
              .upsert({
                cedula: member.cedula_coordinador,
                nombre: member.coordinador,
                telefono: member.movil_coordinador || null,
                correo: member.correo_coordinador || null,
                zona: zona,
                activo: true
              }, { onConflict: 'cedula' });

            if (coordError) {
              stats.errors.push(`Coordinador ${member.cedula_coordinador}: ${coordError.message}`);
            } else {
              stats.coordinadores_created++;
            }
          }
        }

        // Update profile with asesor info (if exists)
        if (member.cc_asesor && member.codigo_asesor) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              codigo_asesor: member.codigo_asesor,
              codigo_jefe: member.codigo_jefe !== 'N/A' ? member.codigo_jefe : null,
              tipo_asesor: member.tipo_asesor || null,
              ccosto_asesor: member.sede || null,
              zona: zona
            })
            .eq('cedula', member.cc_asesor);

          if (!profileError) {
            stats.profiles_updated++;
          }
        }

      } catch (err) {
        stats.errors.push(`Error procesando: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Importación completada: ${stats.jefes_created} jefes, ${stats.lideres_created} líderes, ${stats.coordinadores_created} coordinadores, ${stats.profiles_updated} perfiles actualizados`
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
