import ExcelJS from 'exceljs';

export interface AdvisorExportData {
  cedula: string;
  codigoAsesor: string;
  nombre: string;
  tipoAsesor: string;
  regional?: string;
  byType: Record<string, number>;
  metaByType: Record<string, number>;
  qtyByType?: Record<string, number>;
  metaQtyByType?: Record<string, number>;
}

interface ExportAdvisorsOptions {
  data: AdvisorExportData[];
  includeRegional: boolean;
  fileName?: string;
  title?: string;
}

const SALE_TYPES = ['CONTADO', 'FINANSUENOS', 'ALIADOS'] as const;

const SALE_TYPE_LABELS: Record<string, string> = {
  CONTADO: 'Contado',
  FINANSUENOS: 'FinanSueños',
  ALIADOS: 'Aliados',
};

function createMoneySheet(workbook: ExcelJS.Workbook, data: AdvisorExportData[], includeRegional: boolean, title: string) {
  const worksheet = workbook.addWorksheet(`${title} ($)`);
  const headerRow1: string[] = includeRegional
    ? ['Regional', 'Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor']
    : ['Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor'];

  SALE_TYPES.forEach(tipo => { headerRow1.push(SALE_TYPE_LABELS[tipo], '', ''); });
  headerRow1.push('Total Ventas', '', '');

  const baseColumns = includeRegional ? 5 : 4;
  const headerRow2: string[] = new Array(baseColumns).fill('');
  SALE_TYPES.forEach(() => { headerRow2.push('Meta', 'Ventas', '%Cump'); });
  headerRow2.push('Meta', 'Ventas', '%Cump');

  const row1 = worksheet.addRow(headerRow1);
  const row2 = worksheet.addRow(headerRow2);

  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };
  row2.font = { bold: true };
  row2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6DCE5' } };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };

  let currentCol = baseColumns + 1;
  SALE_TYPES.forEach(() => { worksheet.mergeCells(1, currentCol, 1, currentCol + 2); currentCol += 3; });
  worksheet.mergeCells(1, currentCol, 1, currentCol + 2);
  for (let col = 1; col <= baseColumns; col++) worksheet.mergeCells(1, col, 2, col);

  const columns: Partial<ExcelJS.Column>[] = includeRegional
    ? [{ key: 'regional', width: 15 }, { key: 'cedula', width: 12 }, { key: 'codigo', width: 14 }, { key: 'nombre', width: 30 }, { key: 'tipoAsesor', width: 12 }]
    : [{ key: 'cedula', width: 12 }, { key: 'codigo', width: 14 }, { key: 'nombre', width: 30 }, { key: 'tipoAsesor', width: 12 }];
  SALE_TYPES.forEach(() => { columns.push({ width: 14 }, { width: 14 }, { width: 8 }); });
  columns.push({ width: 14 }, { width: 14 }, { width: 8 });
  worksheet.columns = columns;

  data.forEach((advisor) => {
    const rowData: (string | number)[] = includeRegional
      ? [advisor.regional || '', advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor]
      : [advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor];
    let totalMeta = 0, totalVentas = 0;
    SALE_TYPES.forEach(tipo => {
      const meta = advisor.metaByType[tipo] || advisor.metaByType[tipo.toLowerCase()] || 0;
      const ventas = advisor.byType[tipo] || 0;
      const cumplimiento = meta > 0 ? Math.round((ventas / meta) * 100) : 0;
      rowData.push(meta, ventas, meta > 0 ? `${cumplimiento}%` : '-');
      totalMeta += meta; totalVentas += ventas;
    });
    const totalCumplimiento = totalMeta > 0 ? Math.round((totalVentas / totalMeta) * 100) : 0;
    rowData.push(totalMeta, totalVentas, totalMeta > 0 ? `${totalCumplimiento}%` : '-');
    worksheet.addRow(rowData);
  });

  // Totals row
  const totals: Record<string, { meta: number; ventas: number }> = {};
  SALE_TYPES.forEach(t => { totals[t] = { meta: 0, ventas: 0 }; });
  let grandTotalMeta = 0, grandTotalVentas = 0;
  data.forEach(advisor => {
    SALE_TYPES.forEach(tipo => {
      const meta = advisor.metaByType[tipo] || advisor.metaByType[tipo.toLowerCase()] || 0;
      const ventas = advisor.byType[tipo] || 0;
      totals[tipo].meta += meta; totals[tipo].ventas += ventas;
    });
  });
  const totalsRowData: (string | number)[] = includeRegional ? ['', '', '', 'TOTAL', ''] : ['', '', 'TOTAL', ''];
  SALE_TYPES.forEach(tipo => {
    const { meta, ventas } = totals[tipo];
    totalsRowData.push(meta, ventas, meta > 0 ? `${Math.round((ventas / meta) * 100)}%` : '-');
    grandTotalMeta += meta; grandTotalVentas += ventas;
  });
  const grandCump = grandTotalMeta > 0 ? Math.round((grandTotalVentas / grandTotalMeta) * 100) : 0;
  totalsRowData.push(grandTotalMeta, grandTotalVentas, grandTotalMeta > 0 ? `${grandCump}%` : '-');
  const totalsRow = worksheet.addRow(totalsRowData);
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const numFmt = '#,##0';
  for (let row = 3; row <= worksheet.rowCount; row++) {
    for (let col = baseColumns + 1; col <= baseColumns + (SALE_TYPES.length + 1) * 3; col++) {
      const cell = worksheet.getCell(row, col);
      if ((col - baseColumns - 1) % 3 <= 1 && typeof cell.value === 'number') cell.numFmt = numFmt;
    }
  }
}

function createQuantitySheet(workbook: ExcelJS.Workbook, data: AdvisorExportData[], includeRegional: boolean, title: string) {
  const worksheet = workbook.addWorksheet(`${title} (Q)`);
  const headerRow1: string[] = includeRegional
    ? ['Regional', 'Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor']
    : ['Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor'];
  SALE_TYPES.forEach(tipo => { headerRow1.push(SALE_TYPE_LABELS[tipo], '', ''); });
  headerRow1.push('Total Cantidad', '', '');

  const baseColumns = includeRegional ? 5 : 4;
  const headerRow2: string[] = new Array(baseColumns).fill('');
  SALE_TYPES.forEach(() => { headerRow2.push('Meta Q', 'Ejecutado Q', '%Cump'); });
  headerRow2.push('Meta Q', 'Ejecutado Q', '%Cump');

  const row1 = worksheet.addRow(headerRow1);
  const row2 = worksheet.addRow(headerRow2);
  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };
  row2.font = { bold: true };
  row2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E3CE' } };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };

  let currentCol = baseColumns + 1;
  SALE_TYPES.forEach(() => { worksheet.mergeCells(1, currentCol, 1, currentCol + 2); currentCol += 3; });
  worksheet.mergeCells(1, currentCol, 1, currentCol + 2);
  for (let col = 1; col <= baseColumns; col++) worksheet.mergeCells(1, col, 2, col);

  const columns: Partial<ExcelJS.Column>[] = includeRegional
    ? [{ key: 'regional', width: 15 }, { key: 'cedula', width: 12 }, { key: 'codigo', width: 14 }, { key: 'nombre', width: 30 }, { key: 'tipoAsesor', width: 12 }]
    : [{ key: 'cedula', width: 12 }, { key: 'codigo', width: 14 }, { key: 'nombre', width: 30 }, { key: 'tipoAsesor', width: 12 }];
  SALE_TYPES.forEach(() => { columns.push({ width: 12 }, { width: 12 }, { width: 8 }); });
  columns.push({ width: 12 }, { width: 12 }, { width: 8 });
  worksheet.columns = columns;

  data.forEach((advisor) => {
    const rowData: (string | number)[] = includeRegional
      ? [advisor.regional || '', advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor]
      : [advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor];
    let totalMetaQty = 0, totalEjecutadoQty = 0;
    SALE_TYPES.forEach(tipo => {
      const metaQty = advisor.metaQtyByType?.[tipo] || advisor.metaQtyByType?.[tipo.toLowerCase()] || 0;
      const ejecutadoQty = advisor.qtyByType?.[tipo] || advisor.qtyByType?.[tipo.toLowerCase()] || 0;
      const cump = metaQty > 0 ? Math.round((ejecutadoQty / metaQty) * 100) : 0;
      rowData.push(metaQty, ejecutadoQty, metaQty > 0 ? `${cump}%` : '-');
      totalMetaQty += metaQty; totalEjecutadoQty += ejecutadoQty;
    });
    const totalCump = totalMetaQty > 0 ? Math.round((totalEjecutadoQty / totalMetaQty) * 100) : 0;
    rowData.push(totalMetaQty, totalEjecutadoQty, totalMetaQty > 0 ? `${totalCump}%` : '-');
    worksheet.addRow(rowData);
  });

  const totals: Record<string, { metaQty: number; ejecutadoQty: number }> = {};
  SALE_TYPES.forEach(t => { totals[t] = { metaQty: 0, ejecutadoQty: 0 }; });
  let grandTotalMetaQty = 0, grandTotalEjecutadoQty = 0;
  data.forEach(advisor => {
    SALE_TYPES.forEach(tipo => {
      totals[tipo].metaQty += advisor.metaQtyByType?.[tipo] || advisor.metaQtyByType?.[tipo.toLowerCase()] || 0;
      totals[tipo].ejecutadoQty += advisor.qtyByType?.[tipo] || advisor.qtyByType?.[tipo.toLowerCase()] || 0;
    });
  });
  const totalsRowData: (string | number)[] = includeRegional ? ['', '', '', 'TOTAL', ''] : ['', '', 'TOTAL', ''];
  SALE_TYPES.forEach(tipo => {
    const { metaQty, ejecutadoQty } = totals[tipo];
    totalsRowData.push(metaQty, ejecutadoQty, metaQty > 0 ? `${Math.round((ejecutadoQty / metaQty) * 100)}%` : '-');
    grandTotalMetaQty += metaQty; grandTotalEjecutadoQty += ejecutadoQty;
  });
  const grandCump = grandTotalMetaQty > 0 ? Math.round((grandTotalEjecutadoQty / grandTotalMetaQty) * 100) : 0;
  totalsRowData.push(grandTotalMetaQty, grandTotalEjecutadoQty, grandTotalMetaQty > 0 ? `${grandCump}%` : '-');
  const totalsRow = worksheet.addRow(totalsRowData);
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const numFmt = '#,##0';
  for (let row = 3; row <= worksheet.rowCount; row++) {
    for (let col = baseColumns + 1; col <= baseColumns + (SALE_TYPES.length + 1) * 3; col++) {
      const cell = worksheet.getCell(row, col);
      if ((col - baseColumns - 1) % 3 <= 1 && typeof cell.value === 'number') cell.numFmt = numFmt;
    }
  }
}

export async function exportAdvisorsToExcel({ data, includeRegional, fileName = 'asesores', title = 'Asesores' }: ExportAdvisorsOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-COM Sistema';
  workbook.created = new Date();
  createMoneySheet(workbook, data, includeRegional, title);
  createQuantitySheet(workbook, data, includeRegional, title);

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
