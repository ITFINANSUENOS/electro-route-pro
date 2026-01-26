import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapping from CSV headers to DB fields
const HEADER_MAP: Record<string, string> = {
  'tipo': 'tipo_docum',
  'cod_region': 'cod_region',
  'sede': 'sede',
  'codigo_cco': 'codigo_cco',
  'nombre_cco': 'nombre_cco',
  'identifica': 'cliente_identificacion',
  'cliente': 'cliente_nombre',
  'telefono': 'cliente_telefono',
  'direccion': 'cliente_direccion',
  'correoe': 'cliente_email',
  'tipo_docum': 'tipo_documento',
  'numero_doc': 'numero_doc',
  'fecha_fact': 'fecha',
  'destino': 'destino',
  'dnonombre': 'destino_nombre',
  'cod_forma_': 'cod_forma_pago',
  'forma1pago': 'forma1_pago',
  'formapago': 'forma_pago',
  'cedula_ase': 'cedula_asesor',
  'codigo_ase': 'codigo_asesor',
  'asesor': 'asesor_nombre',
  'codigo_jef': 'codigo_jefe',
  'jefe_venta': 'jefe_ventas',
  'codigo_ean': 'codigo_ean',
  'nombre_pro': 'producto',
  'referencia': 'referencia',
  'nombre_cor': 'nombre_corto',
  'categoria2': 'categoria',
  'codmarca': 'cod_marca',
  'marca': 'marca',
  'codlinea': 'cod_linea',
  'nombre_lin': 'linea',
  'lote': 'lote',
  'serial2': 'serial',
  'mcnclase': 'mcn_clase',
  'cantidad': 'cantidad',
  'subtcontad': 'subtotal',
  'ivacontado': 'iva',
  'totcontado': 'total',
  'vtas_ant_i': 'vtas_ant_i',
  'motivodev': 'motivo_dev',
};

const NUMERIC_FIELDS = ['cantidad', 'subtotal', 'iva', 'total', 'vtas_ant_i', 'cod_region'];

function parseNumber(value: string): number {
  if (!value?.trim()) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string): string {
  if (!value?.trim()) return new Date().toISOString().split('T')[0];
  const clean = value.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (first.length === 4) return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
    return `${third.length === 2 ? '20' + third : third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
    .replace(/[\s\-\.]/g, '_')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function deriveTipoVenta(forma1Pago: string, formaPago: string): string | null {
  const forma1 = (forma1Pago || '').toUpperCase().trim();
  const formaGeneral = (formaPago || '').toUpperCase().trim();
  
  // First: Check for OTROS (to be excluded from reports)
  if (forma1.includes('REBATE') || forma1.includes('ARRENDAMIENTO') || forma1.includes('ACTIVOS FIJOS')) {
    return 'OTROS';
  }
  
  // CONVENIO: ADDI, BRILLA, SISTECREDITO
  if (forma1.includes('ADDI') || forma1.includes('BRILLA') || 
      forma1.includes('SISTECREDITO') || forma1.includes('SISTEMCREDITO')) {
    return 'CONVENIO';
  }
  
  // CREDITO: FINANSUENOS, ARPESOD, RETANQUEO
  if (forma1.includes('FINANSUE') || forma1.includes('ARPESOD') || forma1.includes('RETANQUEO')) {
    return 'CREDITO';
  }
  
  // CREDICONTADO: CUOTAS, INCREMENTO, OBSEQUIOS
  if (forma1.includes('CUOTAS') || forma1.includes('INCREMENTO') || forma1.includes('OBSEQUIOS')) {
    return 'CREDICONTADO';
  }
  
  // CONTADO: All CONTADO variants and CREDITO ENTIDADES
  if (forma1.includes('CONTADO') || forma1.includes('CREDITO ENTIDADES')) {
    return 'CONTADO';
  }
  
  // Fallback to FORMAPAGO field for general classification
  if (formaGeneral === 'CONTADO') return 'CONTADO';
  if (formaGeneral === 'CREDICONTADO') return 'CREDICONTADO';
  if (formaGeneral === 'CREDITO') return 'CREDITO';
  if (formaGeneral === 'CONVENIO') return 'CONVENIO';
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log("Fetching CSV from public/data/VENTAS_ENERO_2026.csv...");

    // First delete all existing records for this period to avoid duplicates
    const { error: deleteError } = await supabase
      .from('ventas')
      .delete()
      .gte('fecha', '2026-01-01')
      .lte('fecha', '2026-01-31');
    
    if (deleteError) {
      console.log("Delete error (might be empty):", deleteError.message);
    }

    // Fetch CSV content from public URL
    const csvResponse = await fetch(`${supabaseUrl.replace('.supabase.co', '.supabase.co/storage/v1/object/public/data')}/VENTAS_ENERO_2026.csv`);
    
    // Try fetching from the app's public folder directly
    const body = await req.json().catch(() => ({}));
    const csvContent = body.csvContent;
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: "CSV content required in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("CSV length:", csvContent.length);

    const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: "CSV file is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const delimiter = ';';
    const headers = parseCSVLine(lines[0], delimiter);
    
    // Build column mapping
    const columnMapping: Record<number, string> = {};
    headers.forEach((h: string, i: number) => {
      const normalized = normalizeHeader(h);
      const dbField = HEADER_MAP[normalized];
      if (dbField) columnMapping[i] = dbField;
    });

    console.log("Mapped columns:", Object.keys(columnMapping).length);

    // Process rows
    const ventas: Record<string, unknown>[] = [];
    const dataRows = lines.slice(1);

    for (const line of dataRows) {
      if (!line.trim()) continue;
      const values = parseCSVLine(line, delimiter);
      if (values.length < 5) continue;

      const venta: Record<string, unknown> = {};

      values.forEach((val: string, idx: number) => {
        const field = columnMapping[idx];
        if (field && val.trim()) {
          if (NUMERIC_FIELDS.includes(field)) {
            venta[field] = parseNumber(val);
          } else if (field === 'fecha') {
            venta[field] = parseDate(val);
          } else {
            venta[field] = val.trim();
          }
        }
      });

      // Required fields
      if (!venta.codigo_asesor) venta.codigo_asesor = (venta.cedula_asesor as string) || 'UNKNOWN';
      if (!venta.fecha) venta.fecha = '2026-01-15';
      if (venta.vtas_ant_i == null) venta.vtas_ant_i = 0;
      
      // Derive tipo_venta from FORMA1PAGO and FORMAPAGO
      venta.tipo_venta = deriveTipoVenta(
        (venta.forma1_pago as string) || '', 
        (venta.forma_pago as string) || ''
      );

      if (!venta.codigo_asesor || (venta.codigo_asesor as string).trim() === '') {
        continue;
      }

      ventas.push(venta);
    }

    console.log("Parsed ventas:", ventas.length);

    if (ventas.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid records found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert in batches
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < ventas.length; i += batchSize) {
      const batch = ventas.slice(i, i + batchSize);
      const { error } = await supabase.from('ventas').insert(batch as never[]);
      
      if (error) {
        console.error("Batch error at", i, ":", error.message);
        throw new Error(`Error inserting batch: ${error.message}`);
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted} of ${ventas.length}`);
    }

    // Verify insertion
    const { count } = await supabase
      .from('ventas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', '2026-01-01')
      .lte('fecha', '2026-01-31');

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted,
        total_in_db: count,
        message: `Successfully loaded ${inserted} sales records` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
