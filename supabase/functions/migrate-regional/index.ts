import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // --- Authentication & Authorization ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const allowedRoles = ["coordinador_comercial", "administrador"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Permisos insuficientes" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      sourceRegionalId,
      targetRegionalId,
      sourceCodRegion,
      targetCodRegion,
      deactivateSource,
      fechaEfectiva,
      notas,
      mode, // 'count' or 'execute'
    } = body;

    if (!sourceRegionalId || !targetRegionalId || !sourceCodRegion || !targetCodRegion) {
      return new Response(
        JSON.stringify({ error: "Parámetros incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count affected records for impact preview
    const { count: ventasCount } = await supabase
      .from("ventas")
      .select("*", { count: "exact", head: true })
      .eq("cod_region", sourceCodRegion);

    const { count: profilesCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("regional_id", sourceRegionalId);

    if (mode === "count") {
      // Check if mapping already exists
      const { data: existingMapping } = await supabase
        .from("regional_mappings")
        .select("id")
        .eq("source_cod_region", sourceCodRegion)
        .eq("activo", true)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          ventasCount: ventasCount || 0,
          profilesCount: profilesCount || 0,
          existingMapping: !!existingMapping,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute: create mapping (NOT modify original data)
    console.log(`Creating regional mapping ${sourceCodRegion} -> ${targetCodRegion} by user ${user.id}`);

    // 1. Insert mapping record
    const { data: mapping, error: mappingError } = await supabase
      .from("regional_mappings")
      .insert({
        source_cod_region: sourceCodRegion,
        target_cod_region: targetCodRegion,
        source_regional_id: sourceRegionalId,
        target_regional_id: targetRegionalId,
        fecha_efectiva: fechaEfectiva || new Date().toISOString().split("T")[0],
        notas: notas || `Consolidación: regional ${sourceCodRegion} → ${targetCodRegion}`,
        creado_por: user.id,
        activo: true,
      })
      .select()
      .single();

    if (mappingError) {
      console.error("Error creating mapping:", mappingError.message);
      return new Response(
        JSON.stringify({ error: `Error creando mapeo: ${mappingError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Optionally deactivate source regional
    if (deactivateSource) {
      const { error: deactivateError } = await supabase
        .from("regionales")
        .update({ activo: false })
        .eq("id", sourceRegionalId);

      if (deactivateError) {
        console.error("Error deactivating regional:", deactivateError.message);
      }
    }

    // 3. Log in historial_ediciones
    await supabase.from("historial_ediciones").insert({
      tabla: "regional_mappings",
      registro_id: mapping.id,
      campo_editado: "creacion_mapeo",
      valor_anterior: `Regional ${sourceCodRegion}`,
      valor_nuevo: `Mapeado a regional ${targetCodRegion}. Ventas afectadas: ${ventasCount || 0}, Perfiles: ${profilesCount || 0}. Datos originales preservados.`,
      modificado_por: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        mappingId: mapping.id,
        ventasAffected: ventasCount || 0,
        profilesAffected: profilesCount || 0,
        deactivated: !!deactivateSource,
        message: "Mapeo creado exitosamente. Los datos originales se preservan.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Error procesando la solicitud" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
