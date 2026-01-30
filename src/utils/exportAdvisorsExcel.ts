import ExcelJS from 'exceljs';

export interface AdvisorExportData {
  cedula: string;
  codigoAsesor: string;
  nombre: string;
  tipoAsesor: string;
  regional?: string;
  byType: Record<string, number>;
  metaByType: Record<string, number>;
  // Quantity data (Q)
  qtyByType?: Record<string, number>;
  metaQtyByType?: Record<string, number>;
}

interface ExportAdvisorsOptions {
  data: AdvisorExportData[];
  includeRegional: boolean;
  fileName?: string;
  title?: string;
}

const SALE_TYPES = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'] as const;

const SALE_TYPE_LABELS: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  ALIADOS: 'Aliados',
};

function createMoneySheet(
  workbook: ExcelJS.Workbook,
  data: AdvisorExportData[],
  includeRegional: boolean,
  title: string
) {
  const worksheet = workbook.addWorksheet(`${title} ($)`);

  // Build header row 1 (merged headers for each sale type)
  const headerRow1: string[] = includeRegional
    ? ['Regional', 'Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor']
    : ['Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor'];

  // Add merged headers for each sale type
  SALE_TYPES.forEach(tipo => {
    headerRow1.push(SALE_TYPE_LABELS[tipo], '', '');
  });
  // Add Total Ventas merged header
  headerRow1.push('Total Ventas', '', '');

  // Build header row 2 (sub-headers)
  const baseColumns = includeRegional ? 5 : 4;
  const headerRow2: string[] = new Array(baseColumns).fill('');
  
  // Sub-headers for each sale type
  SALE_TYPES.forEach(() => {
    headerRow2.push('Meta', 'Ventas', '%Cump');
  });
  // Sub-headers for Total Ventas
  headerRow2.push('Meta', 'Ventas', '%Cump');

  // Add header rows
  const row1 = worksheet.addRow(headerRow1);
  const row2 = worksheet.addRow(headerRow2);

  // Style header row 1
  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Style header row 2
  row2.font = { bold: true };
  row2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6DCE5' },
  };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Merge cells for sale type headers (row 1)
  let currentCol = baseColumns + 1;
  SALE_TYPES.forEach(() => {
    worksheet.mergeCells(1, currentCol, 1, currentCol + 2);
    currentCol += 3;
  });
  // Merge Total Ventas header
  worksheet.mergeCells(1, currentCol, 1, currentCol + 2);

  // Merge cells for base columns (rows 1-2)
  for (let col = 1; col <= baseColumns; col++) {
    worksheet.mergeCells(1, col, 2, col);
  }

  // Set column widths
  const columns: Partial<ExcelJS.Column>[] = includeRegional
    ? [
        { key: 'regional', width: 15 },
        { key: 'cedula', width: 12 },
        { key: 'codigo', width: 14 },
        { key: 'nombre', width: 30 },
        { key: 'tipoAsesor', width: 12 },
      ]
    : [
        { key: 'cedula', width: 12 },
        { key: 'codigo', width: 14 },
        { key: 'nombre', width: 30 },
        { key: 'tipoAsesor', width: 12 },
      ];

  // Add columns for each sale type
  SALE_TYPES.forEach(() => {
    columns.push({ width: 14 }); // Meta
    columns.push({ width: 14 }); // Ventas
    columns.push({ width: 8 });  // %Cump
  });
  // Add Total Ventas columns
  columns.push({ width: 14 }); // Meta
  columns.push({ width: 14 }); // Ventas
  columns.push({ width: 8 });  // %Cump

  worksheet.columns = columns;

  // Add data rows
  data.forEach((advisor) => {
    const rowData: (string | number)[] = includeRegional
      ? [advisor.regional || '', advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor]
      : [advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor];

    let totalMeta = 0;
    let totalVentas = 0;

    // Add data for each sale type
    SALE_TYPES.forEach(tipo => {
      const meta = advisor.metaByType[tipo] || advisor.metaByType[tipo.toLowerCase()] || 0;
      const ventas = advisor.byType[tipo] || 0;
      const cumplimiento = meta > 0 ? Math.round((ventas / meta) * 100) : 0;

      rowData.push(meta, ventas, meta > 0 ? `${cumplimiento}%` : '-');
      totalMeta += meta;
      totalVentas += ventas;
    });

    // Add Total Ventas
    const totalCumplimiento = totalMeta > 0 ? Math.round((totalVentas / totalMeta) * 100) : 0;
    rowData.push(totalMeta, totalVentas, totalMeta > 0 ? `${totalCumplimiento}%` : '-');

    worksheet.addRow(rowData);
  });

  // Add totals row
  const totals: Record<string, { meta: number; ventas: number }> = {};
  SALE_TYPES.forEach(tipo => {
    totals[tipo] = { meta: 0, ventas: 0 };
  });
  let grandTotalMeta = 0;
  let grandTotalVentas = 0;

  data.forEach(advisor => {
    SALE_TYPES.forEach(tipo => {
      const meta = advisor.metaByType[tipo] || advisor.metaByType[tipo.toLowerCase()] || 0;
      const ventas = advisor.byType[tipo] || 0;
      totals[tipo].meta += meta;
      totals[tipo].ventas += ventas;
    });
  });

  const totalsRowData: (string | number)[] = includeRegional
    ? ['', '', '', 'TOTAL', '']
    : ['', '', 'TOTAL', ''];

  SALE_TYPES.forEach(tipo => {
    const meta = totals[tipo].meta;
    const ventas = totals[tipo].ventas;
    const cumplimiento = meta > 0 ? Math.round((ventas / meta) * 100) : 0;
    totalsRowData.push(meta, ventas, meta > 0 ? `${cumplimiento}%` : '-');
    grandTotalMeta += meta;
    grandTotalVentas += ventas;
  });

  // Grand total
  const grandCumplimiento = grandTotalMeta > 0 ? Math.round((grandTotalVentas / grandTotalMeta) * 100) : 0;
  totalsRowData.push(grandTotalMeta, grandTotalVentas, grandTotalMeta > 0 ? `${grandCumplimiento}%` : '-');

  const totalsRow = worksheet.addRow(totalsRowData);
  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Format number columns with Colombian number format
  const numFmt = '#,##0';
  for (let row = 3; row <= worksheet.rowCount; row++) {
    for (let col = baseColumns + 1; col <= baseColumns + (SALE_TYPES.length + 1) * 3; col++) {
      const cell = worksheet.getCell(row, col);
      // Format only Meta and Ventas columns (every 1st and 2nd in groups of 3)
      const colInGroup = (col - baseColumns - 1) % 3;
      if (colInGroup === 0 || colInGroup === 1) {
        if (typeof cell.value === 'number') {
          cell.numFmt = numFmt;
        }
      }
    }
  }
}

function createQuantitySheet(
  workbook: ExcelJS.Workbook,
  data: AdvisorExportData[],
  includeRegional: boolean,
  title: string
) {
  const worksheet = workbook.addWorksheet(`${title} (Q)`);

  // Build header row 1 (merged headers for each sale type)
  const headerRow1: string[] = includeRegional
    ? ['Regional', 'Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor']
    : ['Cédula', 'Codigo Asesor', 'Nombre', 'Tipo Asesor'];

  // Add merged headers for each sale type
  SALE_TYPES.forEach(tipo => {
    headerRow1.push(SALE_TYPE_LABELS[tipo], '', '');
  });
  // Add Total Cantidad merged header
  headerRow1.push('Total Cantidad', '', '');

  // Build header row 2 (sub-headers)
  const baseColumns = includeRegional ? 5 : 4;
  const headerRow2: string[] = new Array(baseColumns).fill('');
  
  // Sub-headers for each sale type
  SALE_TYPES.forEach(() => {
    headerRow2.push('Meta Q', 'Ejecutado Q', '%Cump');
  });
  // Sub-headers for Total
  headerRow2.push('Meta Q', 'Ejecutado Q', '%Cump');

  // Add header rows
  const row1 = worksheet.addRow(headerRow1);
  const row2 = worksheet.addRow(headerRow2);

  // Style header row 1 - Green color for quantity sheet
  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF217346' }, // Green for quantity
  };
  row1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Style header row 2
  row2.font = { bold: true };
  row2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E3CE' }, // Light green
  };
  row2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Merge cells for sale type headers (row 1)
  let currentCol = baseColumns + 1;
  SALE_TYPES.forEach(() => {
    worksheet.mergeCells(1, currentCol, 1, currentCol + 2);
    currentCol += 3;
  });
  // Merge Total header
  worksheet.mergeCells(1, currentCol, 1, currentCol + 2);

  // Merge cells for base columns (rows 1-2)
  for (let col = 1; col <= baseColumns; col++) {
    worksheet.mergeCells(1, col, 2, col);
  }

  // Set column widths
  const columns: Partial<ExcelJS.Column>[] = includeRegional
    ? [
        { key: 'regional', width: 15 },
        { key: 'cedula', width: 12 },
        { key: 'codigo', width: 14 },
        { key: 'nombre', width: 30 },
        { key: 'tipoAsesor', width: 12 },
      ]
    : [
        { key: 'cedula', width: 12 },
        { key: 'codigo', width: 14 },
        { key: 'nombre', width: 30 },
        { key: 'tipoAsesor', width: 12 },
      ];

  // Add columns for each sale type
  SALE_TYPES.forEach(() => {
    columns.push({ width: 12 }); // Meta Q
    columns.push({ width: 12 }); // Ejecutado Q
    columns.push({ width: 8 });  // %Cump
  });
  // Add Total columns
  columns.push({ width: 12 }); // Meta Q
  columns.push({ width: 12 }); // Ejecutado Q
  columns.push({ width: 8 });  // %Cump

  worksheet.columns = columns;

  // Add data rows
  data.forEach((advisor) => {
    const rowData: (string | number)[] = includeRegional
      ? [advisor.regional || '', advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor]
      : [advisor.cedula, advisor.codigoAsesor, advisor.nombre, advisor.tipoAsesor];

    let totalMetaQty = 0;
    let totalEjecutadoQty = 0;

    // Add data for each sale type
    SALE_TYPES.forEach(tipo => {
      const metaQty = advisor.metaQtyByType?.[tipo] || advisor.metaQtyByType?.[tipo.toLowerCase()] || 0;
      const ejecutadoQty = advisor.qtyByType?.[tipo] || advisor.qtyByType?.[tipo.toLowerCase()] || 0;
      const cumplimiento = metaQty > 0 ? Math.round((ejecutadoQty / metaQty) * 100) : 0;

      rowData.push(metaQty, ejecutadoQty, metaQty > 0 ? `${cumplimiento}%` : '-');
      totalMetaQty += metaQty;
      totalEjecutadoQty += ejecutadoQty;
    });

    // Add Total
    const totalCumplimiento = totalMetaQty > 0 ? Math.round((totalEjecutadoQty / totalMetaQty) * 100) : 0;
    rowData.push(totalMetaQty, totalEjecutadoQty, totalMetaQty > 0 ? `${totalCumplimiento}%` : '-');

    worksheet.addRow(rowData);
  });

  // Add totals row
  const totals: Record<string, { metaQty: number; ejecutadoQty: number }> = {};
  SALE_TYPES.forEach(tipo => {
    totals[tipo] = { metaQty: 0, ejecutadoQty: 0 };
  });
  let grandTotalMetaQty = 0;
  let grandTotalEjecutadoQty = 0;

  data.forEach(advisor => {
    SALE_TYPES.forEach(tipo => {
      const metaQty = advisor.metaQtyByType?.[tipo] || advisor.metaQtyByType?.[tipo.toLowerCase()] || 0;
      const ejecutadoQty = advisor.qtyByType?.[tipo] || advisor.qtyByType?.[tipo.toLowerCase()] || 0;
      totals[tipo].metaQty += metaQty;
      totals[tipo].ejecutadoQty += ejecutadoQty;
    });
  });

  const totalsRowData: (string | number)[] = includeRegional
    ? ['', '', '', 'TOTAL', '']
    : ['', '', 'TOTAL', ''];

  SALE_TYPES.forEach(tipo => {
    const metaQty = totals[tipo].metaQty;
    const ejecutadoQty = totals[tipo].ejecutadoQty;
    const cumplimiento = metaQty > 0 ? Math.round((ejecutadoQty / metaQty) * 100) : 0;
    totalsRowData.push(metaQty, ejecutadoQty, metaQty > 0 ? `${cumplimiento}%` : '-');
    grandTotalMetaQty += metaQty;
    grandTotalEjecutadoQty += ejecutadoQty;
  });

  // Grand total
  const grandCumplimiento = grandTotalMetaQty > 0 ? Math.round((grandTotalEjecutadoQty / grandTotalMetaQty) * 100) : 0;
  totalsRowData.push(grandTotalMetaQty, grandTotalEjecutadoQty, grandTotalMetaQty > 0 ? `${grandCumplimiento}%` : '-');

  const totalsRow = worksheet.addRow(totalsRowData);
  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Format number columns
  const numFmt = '#,##0';
  for (let row = 3; row <= worksheet.rowCount; row++) {
    for (let col = baseColumns + 1; col <= baseColumns + (SALE_TYPES.length + 1) * 3; col++) {
      const cell = worksheet.getCell(row, col);
      const colInGroup = (col - baseColumns - 1) % 3;
      if (colInGroup === 0 || colInGroup === 1) {
        if (typeof cell.value === 'number') {
          cell.numFmt = numFmt;
        }
      }
    }
  }
}

export async function exportAdvisorsToExcel({
  data,
  includeRegional,
  fileName = 'asesores',
  title = 'Asesores',
}: ExportAdvisorsOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-COM Sistema';
  workbook.created = new Date();

  // Create first sheet with money values ($)
  createMoneySheet(workbook, data, includeRegional, title);

  // Create second sheet with quantity values (Q)
  createQuantitySheet(workbook, data, includeRegional, title);

  // Generate and download file
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
