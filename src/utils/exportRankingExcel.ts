import ExcelJS from 'exceljs';

export interface RankingAdvisor {
  codigo: string;
  nombre: string;
  tipoAsesor: string;
  cedula?: string;
  regional?: string;
  total: number;
  byType: Record<string, number>;
  totalQty?: number;
  qtyByType?: Record<string, number>;
  metaByType?: Record<string, number>;
  metaQtyByType?: Record<string, number>;
}

interface ExportRankingOptions {
  data: RankingAdvisor[];
  includeRegional: boolean;
  fileName?: string;
}

const SALE_TYPES = ['CONTADO', 'FINANSUENOS', 'ALIADOS'] as const;
const SALE_TYPE_LABELS: Record<string, string> = {
  CONTADO: 'Contado',
  FINANSUENOS: 'FinanSueños',
  ALIADOS: 'Aliados',
};

function createRankingMoneySheet(workbook: ExcelJS.Workbook, data: RankingAdvisor[], includeRegional: boolean) {
  const worksheet = workbook.addWorksheet('Ranking ($)');
  const baseCols = includeRegional
    ? [
        { header: 'Regional', key: 'regional', width: 20 },
        { header: 'Posición', key: 'posicion', width: 10 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 35 },
        { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      ]
    : [
        { header: 'Posición', key: 'posicion', width: 10 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 35 },
        { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      ];

  const typeCols = SALE_TYPES.map(t => ({ header: SALE_TYPE_LABELS[t], key: t.toLowerCase(), width: 15 }));
  worksheet.columns = [...baseCols, ...typeCols, { header: 'Total Ventas', key: 'totalVentas', width: 15 }];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  data.forEach((advisor, index) => {
    const contado = advisor.byType['CONTADO'] || 0;
    const finansuenos = advisor.byType['FINANSUENOS'] || 0;
    const aliados = advisor.byType['ALIADOS'] || 0;
    const totalVentas = contado + finansuenos + aliados;
    const row: any = { posicion: index + 1, cedula: advisor.cedula || '', nombre: advisor.nombre, tipoAsesor: advisor.tipoAsesor, contado, finansuenos, aliados, totalVentas };
    if (includeRegional) row.regional = advisor.regional || '';
    worksheet.addRow(row);
  });

  const totals = data.reduce((acc, a) => {
    acc.contado += a.byType['CONTADO'] || 0;
    acc.finansuenos += a.byType['FINANSUENOS'] || 0;
    acc.aliados += a.byType['ALIADOS'] || 0;
    return acc;
  }, { contado: 0, finansuenos: 0, aliados: 0 });

  const totalRow = worksheet.addRow({
    ...(includeRegional ? { regional: '' } : {}),
    posicion: '', cedula: '', nombre: 'TOTAL', tipoAsesor: '',
    contado: totals.contado, finansuenos: totals.finansuenos, aliados: totals.aliados,
    totalVentas: totals.contado + totals.finansuenos + totals.aliados,
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  ['contado', 'finansuenos', 'aliados', 'totalVentas'].forEach(k => { worksheet.getColumn(k).numFmt = '#,##0'; });
}

function createRankingQuantitySheet(workbook: ExcelJS.Workbook, data: RankingAdvisor[], includeRegional: boolean) {
  const worksheet = workbook.addWorksheet('Ranking (Q)');
  const baseCols = includeRegional
    ? [
        { header: 'Regional', key: 'regional', width: 20 },
        { header: 'Posición', key: 'posicion', width: 10 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 35 },
        { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      ]
    : [
        { header: 'Posición', key: 'posicion', width: 10 },
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 35 },
        { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      ];

  const typeCols = SALE_TYPES.map(t => ({ header: `${SALE_TYPE_LABELS[t]} Q`, key: `${t.toLowerCase()}Q`, width: 12 }));
  worksheet.columns = [...baseCols, ...typeCols, { header: 'Total Q', key: 'totalQ', width: 12 }];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };

  data.forEach((advisor, index) => {
    const contadoQ = advisor.qtyByType?.['CONTADO'] || 0;
    const finansuenosQ = advisor.qtyByType?.['FINANSUENOS'] || 0;
    const aliadosQ = advisor.qtyByType?.['ALIADOS'] || 0;
    const row: any = { posicion: index + 1, cedula: advisor.cedula || '', nombre: advisor.nombre, tipoAsesor: advisor.tipoAsesor, contadoQ, finansuenosQ, aliadosQ, totalQ: contadoQ + finansuenosQ + aliadosQ };
    if (includeRegional) row.regional = advisor.regional || '';
    worksheet.addRow(row);
  });

  const totals = data.reduce((acc, a) => {
    acc.contadoQ += a.qtyByType?.['CONTADO'] || 0;
    acc.finansuenosQ += a.qtyByType?.['FINANSUENOS'] || 0;
    acc.aliadosQ += a.qtyByType?.['ALIADOS'] || 0;
    return acc;
  }, { contadoQ: 0, finansuenosQ: 0, aliadosQ: 0 });

  const totalRow = worksheet.addRow({
    ...(includeRegional ? { regional: '' } : {}),
    posicion: '', cedula: '', nombre: 'TOTAL', tipoAsesor: '',
    contadoQ: totals.contadoQ, finansuenosQ: totals.finansuenosQ, aliadosQ: totals.aliadosQ,
    totalQ: totals.contadoQ + totals.finansuenosQ + totals.aliadosQ,
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  ['contadoQ', 'finansuenosQ', 'aliadosQ', 'totalQ'].forEach(k => { worksheet.getColumn(k).numFmt = '#,##0'; });
}

export async function exportRankingToExcel({ data, includeRegional, fileName = 'ranking_ventas' }: ExportRankingOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-COM Sistema';
  workbook.created = new Date();
  createRankingMoneySheet(workbook, data, includeRegional);
  createRankingQuantitySheet(workbook, data, includeRegional);

  const date = new Date().toISOString().split('T')[0];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
