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
      filterMonth,
      filterYear,
      mode, // 'count' or 'execute'
    } = body;

    if (!sourceRegionalId || !targetRegionalId || !sourceCodRegion || !targetCodRegion) {
      return new Response(
        JSON.stringify({ error: "Parámetros incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build date filter for ventas if period specified
    let dateFilter: { gte?: string; lte?: string } | null = null;
    if (filterMonth && filterYear) {
      const lastDay = new Date(filterYear, filterMonth, 0).getDate();
      dateFilter = {
        gte: `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`,
        lte: `${filterYear}-${String(filterMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      };
    }

    // Count affected records
    let ventasQuery = supabase
      .from("ventas")
      .select("*", { count: "exact", head: true })
      .eq("cod_region", sourceCodRegion);

    if (dateFilter) {
      ventasQuery = ventasQuery.gte("fecha", dateFilter.gte!).lte("fecha", dateFilter.lte!);
    }

    const { count: ventasCount } = await ventasQuery;

    const { count: profilesCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("regional_id", sourceRegionalId);

    if (mode === "count") {
      return new Response(
        JSON.stringify({
          success: true,
          ventasCount: ventasCount || 0,
          profilesCount: profilesCount || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute migration
    console.log(`Migrating regional ${sourceCodRegion} -> ${targetCodRegion} by user ${user.id}`);

    // 1. Update ventas
    let updateVentasQuery = supabase
      .from("ventas")
      .update({ cod_region: targetCodRegion })
      .eq("cod_region", sourceCodRegion);

    if (dateFilter) {
      updateVentasQuery = updateVentasQuery.gte("fecha", dateFilter.gte!).lte("fecha", dateFilter.lte!);
    }

    const { error: ventasError } = await updateVentasQuery;
    if (ventasError) {
      console.error("Error updating ventas:", ventasError.message);
      return new Response(
        JSON.stringify({ error: `Error migrando ventas: ${ventasError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update profiles (always all, not filtered by date)
    const { error: profilesError } = await supabase
      .from("profiles")
      .update({ regional_id: targetRegionalId })
      .eq("regional_id", sourceRegionalId);

    if (profilesError) {
      console.error("Error updating profiles:", profilesError.message);
      return new Response(
        JSON.stringify({ error: `Error migrando perfiles: ${profilesError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Optionally deactivate source regional
    if (deactivateSource) {
      const { error: deactivateError } = await supabase
        .from("regionales")
        .update({ activo: false })
        .eq("id", sourceRegionalId);

      if (deactivateError) {
        console.error("Error deactivating regional:", deactivateError.message);
      }
    }

    // 4. Log in historial_ediciones
    await supabase.from("historial_ediciones").insert({
      tabla: "regionales",
      registro_id: sourceRegionalId,
      campo_editado: "migracion_regional",
      valor_anterior: `Regional ${sourceCodRegion}`,
      valor_nuevo: `Migrado a regional ${targetCodRegion}. Ventas: ${ventasCount || 0}, Perfiles: ${profilesCount || 0}${dateFilter ? ` (periodo: ${filterMonth}/${filterYear})` : " (todos)"}`,
      modificado_por: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ventasMigrated: ventasCount || 0,
        profilesMigrated: profilesCount || 0,
        deactivated: !!deactivateSource,
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
