import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GENERIC_ERRORS = {
  VALIDATION: 'Datos de entrada inválidos',
  SERVER: 'Error procesando la solicitud',
};

const MAX_CSV_ROWS = 15000;

const MAX_LENGTHS = {
  nombre: 200,
  direccion: 500,
  email: 254,
  telefono: 20,
};

function sanitizeCSVField(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

function truncateField(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  const sanitized = sanitizeCSVField(value);
  return sanitized.slice(0, maxLength);
}

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
  'tipo_venta': 'tipo_venta',
};

const NUMERIC_FIELDS = ['cantidad', 'subtotal', 'iva', 'total', 'vtas_ant_i', 'cod_region'];
const TEXT_FIELDS_WITH_LIMITS: Record<string, number> = {
  'cliente_nombre': MAX_LENGTHS.nombre,
  'cliente_direccion': MAX_LENGTHS.direccion,
  'cliente_email': MAX_LENGTHS.email,
  'cliente_telefono': MAX_LENGTHS.telefono,
  'asesor_nombre': MAX_LENGTHS.nombre,
  'jefe_ventas': MAX_LENGTHS.nombre,
};

function parseNumber(value: string): number {
  if (!value?.trim()) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string): string | null {
  if (!value?.trim()) return null;
  const clean = value.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    let dateStr: string;
    if (first.length === 4) {
      dateStr = `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
    } else {
      dateStr = `${third.length === 2 ? '20' + third : third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return dateStr;
    }
  }
  return null;
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

// deno-lint-ignore no-explicit-any
async function buildPaymentTypeLookup(supabase: any): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('formas_pago')
    .select('codigo, tipo_venta')
    .eq('activo', true);
  
  if (error) {
    console.error("Error fetching formas_pago:", error.message);
    return new Map();
  }
  
  const lookup = new Map<string, string>();
  if (data && Array.isArray(data)) {
    for (const fp of data) {
      if (fp.codigo && fp.tipo_venta) {
        lookup.set(String(fp.codigo).toUpperCase().trim(), String(fp.tipo_venta));
      }
    }
  }
  return lookup;
}

function deriveTipoVenta(forma1Pago: string, formaPago: string, lookup: Map<string, string>): string | null {
  const forma1 = (forma1Pago || '').toUpperCase().trim();
  const formaGeneral = (formaPago || '').toUpperCase().trim();
  
  if (lookup.has(forma1)) return lookup.get(forma1)!;
  
  for (const [codigo, tipoVenta] of lookup.entries()) {
    if (forma1.includes(codigo) || codigo.includes(forma1)) return tipoVenta;
  }
  
  if (formaGeneral === 'CONTADO') return 'CONTADO';
  if (formaGeneral === 'CREDICONTADO') return 'CREDICONTADO';
  if (formaGeneral === 'CREDITO') return 'CREDITO';
  if (formaGeneral === 'CONVENIO') return 'ALIADOS';
  if (formaGeneral === 'ALIADOS') return 'ALIADOS';
  
  return null;
}

/**
 * Detect the target month/year from parsed dates in the CSV.
 * Returns the month/year that has the most records.
 */
function detectTargetPeriod(dates: string[]): { month: number; year: number } {
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (!d) continue;
    const key = d.substring(0, 7); // YYYY-MM
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  let maxKey = '';
  let maxCount = 0;
  for (const [key, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }
  
  if (!maxKey) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  
  const [yearStr, monthStr] = maxKey.split('-');
  return { month: parseInt(monthStr), year: parseInt(yearStr) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS for reliable delete + insert
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log("Loading sales data...");

    const body = await req.json().catch(() => ({}));
    const csvContent = body.csvContent;
    const targetMonth = body.targetMonth as number | undefined;
    const targetYear = body.targetYear as number | undefined;
    const cargaId = body.cargaId as string | undefined;
    const cargadoPor = body.cargadoPor as string | undefined;
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentTypeLookup = await buildPaymentTypeLookup(supabase);

    const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lines.length > MAX_CSV_ROWS) {
      return new Response(
        JSON.stringify({ error: `El archivo excede el máximo de ${MAX_CSV_ROWS} registros` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const delimiter = ';';
    const headers = parseCSVLine(lines[0], delimiter);
    
    const columnMapping: Record<number, string> = {};
    headers.forEach((h: string, i: number) => {
      const normalized = normalizeHeader(h);
      const dbField = HEADER_MAP[normalized];
      if (dbField) columnMapping[i] = dbField;
    });

    console.log("Mapped columns:", Object.keys(columnMapping).length);

    const ventas: Record<string, unknown>[] = [];
    const parsedDates: string[] = [];
    const dataRows = lines.slice(1);
    let invalidRows = 0;

    for (const line of dataRows) {
      if (!line.trim()) continue;
      const values = parseCSVLine(line, delimiter);
      if (values.length < 5) {
        invalidRows++;
        continue;
      }

      const venta: Record<string, unknown> = {};

      values.forEach((val: string, idx: number) => {
        const field = columnMapping[idx];
        if (field && val.trim()) {
          if (NUMERIC_FIELDS.includes(field)) {
            venta[field] = parseNumber(val);
          } else if (field === 'fecha') {
            const parsedDate = parseDate(val);
            if (parsedDate) {
              venta[field] = parsedDate;
              parsedDates.push(parsedDate);
            }
          } else {
            const maxLen = TEXT_FIELDS_WITH_LIMITS[field] || 500;
            venta[field] = truncateField(val, maxLen);
          }
        }
      });

      if (!venta.codigo_asesor) venta.codigo_asesor = (venta.cedula_asesor as string) || 'UNKNOWN';
      if (!venta.fecha) {
        invalidRows++;
        continue;
      }
      if (venta.vtas_ant_i == null) venta.vtas_ant_i = 0;
      
      if (!venta.tipo_venta) {
        venta.tipo_venta = deriveTipoVenta(
          (venta.forma1_pago as string) || '', 
          (venta.forma_pago as string) || '',
          paymentTypeLookup
        );
      }

      if (!venta.codigo_asesor || (venta.codigo_asesor as string).trim() === '') {
        invalidRows++;
        continue;
      }

      // Add carga metadata
      if (cargaId) venta.carga_id = cargaId;
      if (cargadoPor) venta.cargado_por = cargadoPor;

      ventas.push(venta);
    }

    console.log("Parsed ventas:", ventas.length, "Invalid rows:", invalidRows);

    if (ventas.length === 0) {
      return new Response(
        JSON.stringify({ error: "No se encontraron registros válidos en el archivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect target period from data or use provided values
    const period = (targetMonth && targetYear)
      ? { month: targetMonth, year: targetYear }
      : detectTargetPeriod(parsedDates);

    const monthStart = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const monthEnd = `${period.year}-${String(period.month).padStart(2, '0')}-31`;

    console.log(`Target period: ${monthStart} to ${monthEnd}`);

    // Check previous record count for this period before deleting
    const { count: previousCount } = await supabase
      .from('ventas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', monthStart)
      .lte('fecha', monthEnd);

    console.log(`Previous records in period: ${previousCount}, New records: ${ventas.length}`);

    // DELETE existing records for this month using service role (bypasses RLS)
    const { error: deleteError, count: deletedCount } = await supabase
      .from('ventas')
      .delete({ count: 'exact' })
      .gte('fecha', monthStart)
      .lte('fecha', monthEnd);
    
    if (deleteError) {
      console.error("Delete error:", deleteError.message);
      return new Response(
        JSON.stringify({ error: `Error eliminando datos anteriores: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleted ${deletedCount} existing records for period`);

    // Insert in batches
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < ventas.length; i += batchSize) {
      const batch = ventas.slice(i, i + batchSize);
      const { error } = await supabase.from('ventas').insert(batch as never[]);
      
      if (error) {
        console.error("Batch error at", i, ":", error.message);
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted} of ${ventas.length}`);
    }

    // Verify final count
    const { count: finalCount } = await supabase
      .from('ventas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', monthStart)
      .lte('fecha', monthEnd);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted,
        deleted: deletedCount || 0,
        previous_count: previousCount || 0,
        total_in_db: finalCount,
        invalid_rows: invalidRows,
        period: { month: period.month, year: period.year },
        message: `Cargados ${inserted} registros de ventas exitosamente (${deletedCount || 0} anteriores eliminados)` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
