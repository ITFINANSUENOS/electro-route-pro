import ExcelJS from 'exceljs';
import { dataService } from '@/services';
import { UserRole } from '@/types/auth';
import { loadMetaQuantityConfig, calculateMetaQuantity, MetaQuantityConfig } from './calculateMetaQuantity';

interface MetaData {
  codigo_asesor: string;
  valor_meta: number;
  tipo_meta: string | null;
}

interface AdvisorInfo {
  codigo_asesor: string;
  nombre_completo: string;
  cedula: string;
  tipo_asesor: string | null;
  regional_id: string | null;
  regional_nombre?: string | null;
}

const TIPOS_VENTA = ['CONTADO', 'FINANSUENOS', 'ALIADOS'];

const TIPO_VENTA_LABELS: Record<string, string> = {
  CONTADO: 'Contado',
  FINANSUENOS: 'FinanSueños',
  ALIADOS: 'Aliados',
};

// Map legacy tipo_meta values to current types
function normalizeTipoMeta(tipo: string | null): string {
  if (!tipo) return '';
  const upper = tipo.toUpperCase();
  if (upper === 'CREDITO' || upper === 'CREDICONTADO') return 'FINANSUENOS';
  return upper;
}

export async function exportMetasDetailExcel(
  role: UserRole | null,
  regionalId: string | null,
  zona: string | null,
  mes?: number,
  anio?: number
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const currentMonth = mes ?? (new Date().getMonth() + 1);
    const currentYear = anio ?? new Date().getFullYear();
    const config = await loadMetaQuantityConfig();

    const { data: metas, error: metasError } = await (dataService
      .from('metas')
      .select('codigo_asesor, valor_meta, tipo_meta')
      .eq('mes', currentMonth)
      .eq('anio', currentYear) as any);

    if (metasError) return { success: false, count: 0, error: metasError.message };
    if (!metas || metas.length === 0) return { success: false, count: 0, error: 'No hay metas registradas para este período' };

    let advisorsQuery = dataService
      .from('profiles')
      .select(`codigo_asesor, nombre_completo, cedula, tipo_asesor, regional_id, regionales!profiles_regional_id_fkey (nombre)`)
      .eq('activo', true)
      .not('codigo_asesor', 'is', null);

    if (role === 'coordinador_comercial' && zona) {
      const { data: zonalRegionales } = await (dataService.from('regionales').select('id').eq('zona', zona).eq('activo', true) as any);
      if (zonalRegionales?.length > 0) advisorsQuery = advisorsQuery.in('regional_id', zonalRegionales.map(r => r.id));
    } else if ((role === 'lider_zona' || role === 'jefe_ventas') && regionalId) {
      advisorsQuery = advisorsQuery.eq('regional_id', regionalId);
    } else if (role !== 'administrador') {
      return { success: false, count: 0, error: 'No tienes permisos para descargar este reporte' };
    }

    const { data: advisors, error: advisorsError } = await advisorsQuery.order('nombre_completo');
    if (advisorsError) return { success: false, count: 0, error: advisorsError.message };

    const metasByAdvisor = metas.reduce((acc, meta) => {
      if (!acc[meta.codigo_asesor]) acc[meta.codigo_asesor] = [];
      acc[meta.codigo_asesor].push(meta);
      return acc;
    }, {} as Record<string, MetaData[]>);

    const advisorsWithMetas = (advisors || []).filter((a: any) => metasByAdvisor[a.codigo_asesor]);
    if (advisorsWithMetas.length === 0) return { success: false, count: 0, error: 'No hay asesores con metas para este período' };

    const showRegional = role === 'administrador' || role === 'coordinador_comercial';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-COM Sistema';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Metas Detalladas');

    const columns: Partial<ExcelJS.Column>[] = [];
    if (showRegional) columns.push({ header: 'REGIONAL', key: 'regional', width: 20 });
    columns.push(
      { header: 'CÉDULA', key: 'cedula', width: 15 },
      { header: 'CÓDIGO', key: 'codigo', width: 12 },
      { header: 'NOMBRE', key: 'nombre', width: 35 },
      { header: 'TIPO', key: 'tipo_asesor', width: 12 }
    );

    TIPOS_VENTA.forEach(tipo => {
      columns.push(
        { header: `${TIPO_VENTA_LABELS[tipo]} $`, key: `${tipo}_valor`, width: 15 },
        { header: `${TIPO_VENTA_LABELS[tipo]} Q`, key: `${tipo}_cantidad`, width: 12 }
      );
    });
    columns.push({ header: 'TOTAL $', key: 'total_valor', width: 18 }, { header: 'TOTAL Q', key: 'total_cantidad', width: 12 });

    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    advisorsWithMetas.forEach((advisor: any) => {
      const advisorMetas = metasByAdvisor[advisor.codigo_asesor] || [];
      const rowData: Record<string, any> = {};
      if (showRegional) rowData.regional = advisor.regionales?.nombre || 'SIN REGIONAL';
      rowData.cedula = advisor.cedula || '';
      rowData.codigo = advisor.codigo_asesor || '';
      rowData.nombre = advisor.nombre_completo || '';
      rowData.tipo_asesor = advisor.tipo_asesor || '';

      let totalValor = 0;
      let totalCantidad = 0;

      TIPOS_VENTA.forEach(tipo => {
        // Find meta matching this type (with normalization for legacy data)
        const meta = advisorMetas.find(m => normalizeTipoMeta(m.tipo_meta) === tipo);
        const valorMeta = meta?.valor_meta || 0;
        let cantidad = 0;
        if (valorMeta > 0 && advisor.tipo_asesor && advisor.regional_id) {
          const result = calculateMetaQuantity(valorMeta, advisor.tipo_asesor, tipo, advisor.regional_id, config);
          cantidad = result.cantidadFinal;
        }
        rowData[`${tipo}_valor`] = valorMeta;
        rowData[`${tipo}_cantidad`] = cantidad;
        totalValor += valorMeta;
        totalCantidad += cantidad;
      });

      rowData.total_valor = totalValor;
      rowData.total_cantidad = totalCantidad;
      const row = worksheet.addRow(rowData);
      if (row.number % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }
    });

    const currencyColumns = ['total_valor'];
    TIPOS_VENTA.forEach(tipo => currencyColumns.push(`${tipo}_valor`));
    currencyColumns.forEach(colKey => {
      const col = worksheet.getColumn(colKey);
      if (col) col.numFmt = '"$"#,##0';
    });

    const lastDataRow = worksheet.rowCount;
    const totalsRow = worksheet.addRow({});
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

    let colIndex = showRegional ? 6 : 5;
    TIPOS_VENTA.forEach(() => {
      const valorCol = worksheet.getColumn(colIndex).letter;
      const cantidadCol = worksheet.getColumn(colIndex + 1).letter;
      totalsRow.getCell(colIndex).value = { formula: `SUM(${valorCol}2:${valorCol}${lastDataRow})` };
      totalsRow.getCell(colIndex + 1).value = { formula: `SUM(${cantidadCol}2:${cantidadCol}${lastDataRow})` };
      colIndex += 2;
    });

    const totalValorCol = worksheet.getColumn(colIndex).letter;
    const totalCantidadCol = worksheet.getColumn(colIndex + 1).letter;
    totalsRow.getCell(colIndex).value = { formula: `SUM(${totalValorCol}2:${totalValorCol}${lastDataRow})` };
    totalsRow.getCell(colIndex + 1).value = { formula: `SUM(${totalCantidadCol}2:${totalCantidadCol}${lastDataRow})` };

    if (showRegional) totalsRow.getCell(1).value = 'TOTALES';
    else totalsRow.getCell(1).value = 'TOTALES';

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const filename = `Metas_Detalladas_${monthNames[currentMonth - 1]}${currentYear}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: advisorsWithMetas.length };
  } catch (error) {
    console.error('Error generating metas detail excel:', error);
    return { success: false, count: 0, error: 'Error al generar el archivo Excel' };
  }
}
