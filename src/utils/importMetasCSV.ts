import { supabase } from '@/integrations/supabase/client';

interface MetaRow {
  codigo_asesor: string;
  valor_meta: number;
  tipo_meta: string;
}

/**
 * Parse Colombian currency format: " $ 15.000.000 " -> 15000000
 */
function parseCurrency(value: string): number {
  if (!value?.trim()) return 0;
  // Remove $ symbol, spaces, and dots (thousand separators)
  const cleaned = value.replace(/[$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse CSV line handling quoted fields
 */
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

/**
 * Import metas from CSV content
 * Expected columns: SEDE, CEDULA_ASE, CODIGO_ASE, ASESOR, CONTADO, CREDITO, CREDICONTADO, ALIADOS, TOTAL
 */
export async function importMetasCSV(
  csvContent: string,
  mes: number,
  anio: number
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  const metasToInsert: MetaRow[] = [];
  
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { success: false, imported: 0, errors: ['El archivo está vacío o no tiene datos'] };
  }

  const delimiter = ';';
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.toUpperCase().trim());
  
  // Normalize headers to handle encoding issues (CRÉDITO may come as CR?DITO, CR�DITO, etc.)
  const normalizeHeader = (h: string): string => {
    return h
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^A-Z0-9_]/g, ''); // Remove non-alphanumeric chars (keeps underscores)
  };
  
  // Normalize all headers for comparison
  const normalizedHeaders = headers.map(normalizeHeader);
  
  console.log('Original headers:', headers);
  console.log('Normalized headers:', normalizedHeaders);
  
  // Find column indices with flexible matching for encoding issues
  const codigoIdx = headers.findIndex(h => h.includes('CODIGO') && h.includes('ASE'));
  const contadoIdx = headers.findIndex(h => h === 'CONTADO');
  
  // Match CREDITO - exclude CREDICONTADO first, then match anything that starts with CRED and ends with O
  // but is NOT CREDICONTADO
  const creditoIdx = normalizedHeaders.findIndex((nh, idx) => {
    // Skip if it's CREDICONTADO
    if (nh === 'CREDICONTADO') return false;
    // Match CREDITO or any corrupted version like CRDITO
    return nh === 'CREDITO' || (nh.startsWith('CR') && nh.endsWith('DITO') && !nh.includes('CONTADO'));
  });
  
  const credicontadoIdx = normalizedHeaders.findIndex(nh => nh === 'CREDICONTADO');
  const aliadosIdx = headers.findIndex(h => h === 'ALIADOS' || h === 'CONVENIO');
  
  console.log('Column indices found - codigo:', codigoIdx, 'contado:', contadoIdx, 'credito:', creditoIdx, 'credicontado:', credicontadoIdx, 'aliados:', aliadosIdx);

  if (codigoIdx === -1) {
    return { success: false, imported: 0, errors: ['No se encontró la columna CODIGO_ASE'] };
  }

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line, delimiter);
    const codigoAsesor = values[codigoIdx]?.trim();
    
    if (!codigoAsesor) {
      errors.push(`Fila ${i + 1}: código de asesor vacío`);
      continue;
    }

    // Parse each type of meta
    const tiposMeta = [
      { idx: contadoIdx, tipo: 'contado' },
      { idx: creditoIdx, tipo: 'credito' },
      { idx: credicontadoIdx, tipo: 'credicontado' },
      { idx: aliadosIdx, tipo: 'aliados' },
    ];

    for (const { idx, tipo } of tiposMeta) {
      if (idx === -1) continue;
      const valor = parseCurrency(values[idx]);
      if (valor > 0) {
        metasToInsert.push({
          codigo_asesor: codigoAsesor,
          valor_meta: valor,
          tipo_meta: tipo,
        });
      }
    }
  }

  if (metasToInsert.length === 0) {
    return { success: false, imported: 0, errors: ['No se encontraron metas válidas en el archivo'] };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get existing metas total before deletion (for history)
  const { data: existingMetas } = await supabase
    .from('metas')
    .select('valor_meta')
    .eq('mes', mes)
    .eq('anio', anio);

  const montoTotalAnterior = existingMetas?.reduce((sum, m) => sum + m.valor_meta, 0) || 0;
  const registrosAnteriores = existingMetas?.length || 0;

  // Delete existing metas for this period
  const { error: deleteError } = await supabase
    .from('metas')
    .delete()
    .eq('mes', mes)
    .eq('anio', anio);

  if (deleteError) {
    console.error('Error deleting existing metas:', deleteError);
    return { success: false, imported: 0, errors: ['Error al eliminar metas anteriores'] };
  }

  // Insert new metas in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < metasToInsert.length; i += batchSize) {
    const batch = metasToInsert.slice(i, i + batchSize).map(m => ({
      ...m,
      mes,
      anio,
      cargado_por: user?.id || null,
    }));

    const { error: insertError } = await supabase
      .from('metas')
      .insert(batch);

    if (insertError) {
      console.error('Insert error:', insertError);
      errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
    } else {
      inserted += batch.length;
    }
  }

  // Calculate new total for history
  const montoTotalNuevo = metasToInsert.reduce((sum, m) => sum + m.valor_meta, 0);

  // Record in historial_metas
  if (inserted > 0) {
    const accion = registrosAnteriores > 0 ? 'correccion' : 'carga_masiva';
    
    const { error: historialError } = await supabase
      .from('historial_metas')
      .insert({
        mes,
        anio,
        accion,
        registros_afectados: inserted,
        monto_total_anterior: montoTotalAnterior,
        monto_total_nuevo: montoTotalNuevo,
        modificado_por: user?.id || null,
        notas: registrosAnteriores > 0 
          ? `Reemplazo de ${registrosAnteriores} metas por ${inserted} nuevas`
          : `Carga inicial de ${inserted} metas`,
      });

    if (historialError) {
      console.error('Error recording historial:', historialError);
      // Don't fail the import for this
    }
  }

  return {
    success: inserted > 0,
    imported: inserted,
    errors,
  };
}
