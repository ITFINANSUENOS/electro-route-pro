import { dataService } from '@/services';

interface MetaRow {
  codigo_asesor: string;
  valor_meta: number;
  tipo_meta: string;
  tipo_meta_categoria: string;
}

function sanitizeCSVField(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) return "'" + trimmed;
  return trimmed;
}

function parseCurrency(value: string): number {
  if (!value?.trim()) return 0;
  const trimmed = value.trim();
  let cleaned = trimmed.replace(/[^0-9.,\-]/g, '');
  const commaIdx = cleaned.lastIndexOf(',');
  if (commaIdx !== -1) {
    const intPart = cleaned.substring(0, commaIdx).replace(/\./g, '');
    const decPart = cleaned.substring(commaIdx + 1);
    cleaned = intPart + '.' + decPart;
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  } else {
    cleaned = cleaned.replace(/\./g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
    else { current += char; }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/**
 * Normalize tipo_meta from CSV to current system types.
 * Maps legacy credito/credicontado → finansuenos
 */
function normalizeTipoMeta(tipo: string): string {
  const lower = tipo.toLowerCase();
  if (lower === 'credito' || lower === 'credicontado') return 'finansuenos';
  return lower;
}

export async function importMetasCSV(
  csvContent: string,
  mes: number,
  anio: number,
  tipoMetaCategoria: 'comercial' | 'nacional' = 'comercial'
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  const metasToInsert: MetaRow[] = [];
  
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { success: false, imported: 0, errors: ['El archivo está vacío o no tiene datos'] };

  const delimiter = ';';
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.toUpperCase().trim());
  
  const normalizeHeader = (h: string): string => {
    return h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9_]/g, '');
  };
  const normalizedHeaders = headers.map(normalizeHeader);
  
  const codigoIdx = headers.findIndex(h => h.includes('CODIGO') && h.includes('ASE'));
  const contadoIdx = headers.findIndex(h => h === 'CONTADO');
  
  // Match FINANSUENOS or legacy CREDITO (not CREDICONTADO)
  const finansuenosIdx = normalizedHeaders.findIndex((nh) => {
    return nh === 'FINANSUENOS' || nh === 'FINANSUEOS';
  });
  
  // Legacy: match CREDITO (not CREDICONTADO) - maps to finansuenos
  const creditoIdx = finansuenosIdx === -1 ? normalizedHeaders.findIndex((nh) => {
    if (nh === 'CREDICONTADO') return false;
    return nh === 'CREDITO' || (nh.startsWith('CR') && nh.endsWith('DITO') && !nh.includes('CONTADO'));
  }) : -1;
  
  // Legacy: match CREDICONTADO - maps to finansuenos
  const credicontadoIdx = finansuenosIdx === -1 ? normalizedHeaders.findIndex(nh => nh === 'CREDICONTADO') : -1;
  
  const aliadosIdx = headers.findIndex(h => h === 'ALIADOS' || h === 'CONVENIO');

  if (codigoIdx === -1) return { success: false, imported: 0, errors: ['No se encontró la columna CODIGO_ASE'] };

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line, delimiter);
    const rawCodigoAsesor = values[codigoIdx]?.trim();
    const codigoAsesor = sanitizeCSVField(rawCodigoAsesor || '');
    
    if (!codigoAsesor || !/^[a-zA-Z0-9']+$/.test(codigoAsesor)) {
      errors.push(`Fila ${i + 1}: código de asesor vacío`);
      continue;
    }

    // Build list of metas to parse
    const tiposMeta: { idx: number; tipo: string }[] = [
      { idx: contadoIdx, tipo: 'contado' },
      { idx: aliadosIdx, tipo: 'aliados' },
    ];

    // If new format with FINANSUENOS column
    if (finansuenosIdx !== -1) {
      tiposMeta.push({ idx: finansuenosIdx, tipo: 'finansuenos' });
    } else {
      // Legacy format: credito + credicontado → sum into finansuenos
      const creditoVal = creditoIdx !== -1 ? parseCurrency(values[creditoIdx]) : 0;
      const credicontadoVal = credicontadoIdx !== -1 ? parseCurrency(values[credicontadoIdx]) : 0;
      const finansuenosVal = creditoVal + credicontadoVal;
      if (finansuenosVal !== 0) {
        metasToInsert.push({
          codigo_asesor: codigoAsesor,
          valor_meta: finansuenosVal,
          tipo_meta: 'finansuenos',
          tipo_meta_categoria: tipoMetaCategoria,
        });
      }
    }

    for (const { idx, tipo } of tiposMeta) {
      if (idx === -1) continue;
      const valor = parseCurrency(values[idx]);
      if (valor !== 0) {
        metasToInsert.push({
          codigo_asesor: codigoAsesor,
          valor_meta: valor,
          tipo_meta: tipo,
          tipo_meta_categoria: tipoMetaCategoria,
        });
      }
    }
  }

  if (metasToInsert.length === 0) return { success: false, imported: 0, errors: ['No se encontraron metas válidas en el archivo'] };

  const { data: { user } } = await dataService.auth.getUser();

  // Get existing metas total before deletion
  let allExistingMetas: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data } = await (dataService.from('metas').select('valor_meta').eq('mes', mes).eq('anio', anio).eq('tipo_meta_categoria', tipoMetaCategoria).range(page * pageSize, (page + 1) * pageSize - 1) as any);
    if (data && data.length > 0) { allExistingMetas = [...allExistingMetas, ...data]; hasMore = data.length === pageSize; page++; }
    else { hasMore = false; }
  }

  const montoTotalAnterior = allExistingMetas.reduce((sum: number, m: any) => sum + m.valor_meta, 0);
  const registrosAnteriores = allExistingMetas.length;

  const { error: deleteError } = await (dataService.from('metas').delete().eq('mes', mes).eq('anio', anio).eq('tipo_meta_categoria', tipoMetaCategoria) as any);
  if (deleteError) return { success: false, imported: 0, errors: ['Error al eliminar metas anteriores'] };

  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < metasToInsert.length; i += batchSize) {
    const batch = metasToInsert.slice(i, i + batchSize).map(m => ({
      codigo_asesor: m.codigo_asesor, valor_meta: m.valor_meta, tipo_meta: m.tipo_meta,
      tipo_meta_categoria: m.tipo_meta_categoria, mes, anio, cargado_por: (user as any)?.id || null,
    }));
    const { error: insertError } = await (dataService.from('metas').insert(batch) as any);
    if (insertError) { errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`); }
    else { inserted += batch.length; }
  }

  const montoTotalNuevo = metasToInsert.reduce((sum, m) => sum + m.valor_meta, 0);
  if (inserted > 0) {
    const accion = registrosAnteriores > 0 ? 'correccion' : 'carga_masiva';
    await (dataService.from('historial_metas').insert({
      mes, anio, accion, registros_afectados: inserted,
      monto_total_anterior: montoTotalAnterior, monto_total_nuevo: montoTotalNuevo,
      modificado_por: (user as any)?.id || null, tipo_meta_categoria: tipoMetaCategoria,
      notas: registrosAnteriores > 0 ? `Reemplazo de ${registrosAnteriores} metas ${tipoMetaCategoria.toUpperCase()} por ${inserted} nuevas` : `Carga inicial de ${inserted} metas ${tipoMetaCategoria.toUpperCase()}`,
    }) as any);
  }

  return { success: inserted > 0, imported: inserted, errors };
}
