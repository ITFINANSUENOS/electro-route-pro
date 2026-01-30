import ExcelJS from 'exceljs';

export interface RankingAdvisor {
  codigo: string;
  nombre: string;
  tipoAsesor: string;
  cedula?: string;
  regional?: string;
  total: number;
  byType: Record<string, number>;
  // Quantity data
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

function createRankingMoneySheet(
  workbook: ExcelJS.Workbook,
  data: RankingAdvisor[],
  includeRegional: boolean
) {
  const worksheet = workbook.addWorksheet('Ranking ($)');

  // Define columns based on whether regional is included
  if (includeRegional) {
    worksheet.columns = [
      { header: 'Regional', key: 'regional', width: 20 },
      { header: 'Posición', key: 'posicion', width: 10 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      { header: 'Contado', key: 'contado', width: 15 },
      { header: 'Credi Contado', key: 'credicontado', width: 15 },
      { header: 'Crédito', key: 'credito', width: 15 },
      { header: 'Aliados', key: 'aliados', width: 15 },
      { header: 'Total Ventas', key: 'totalVentas', width: 15 },
    ];
  } else {
    worksheet.columns = [
      { header: 'Posición', key: 'posicion', width: 10 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      { header: 'Contado', key: 'contado', width: 15 },
      { header: 'Credi Contado', key: 'credicontado', width: 15 },
      { header: 'Crédito', key: 'credito', width: 15 },
      { header: 'Aliados', key: 'aliados', width: 15 },
      { header: 'Total Ventas', key: 'totalVentas', width: 15 },
    ];
  }

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  data.forEach((advisor, index) => {
    const contado = advisor.byType['CONTADO'] || 0;
    const credicontado = advisor.byType['CREDICONTADO'] || 0;
    const credito = advisor.byType['CREDITO'] || 0;
    const aliados = advisor.byType['ALIADOS'] || 0;
    const totalVentas = contado + credicontado + credito + aliados;

    if (includeRegional) {
      worksheet.addRow({
        regional: advisor.regional || '',
        posicion: index + 1,
        cedula: advisor.cedula || '',
        nombre: advisor.nombre,
        tipoAsesor: advisor.tipoAsesor,
        contado,
        credicontado,
        credito,
        aliados,
        totalVentas,
      });
    } else {
      worksheet.addRow({
        posicion: index + 1,
        cedula: advisor.cedula || '',
        nombre: advisor.nombre,
        tipoAsesor: advisor.tipoAsesor,
        contado,
        credicontado,
        credito,
        aliados,
        totalVentas,
      });
    }
  });

  // Add totals row
  const totals = data.reduce((acc, advisor) => {
    acc.contado += advisor.byType['CONTADO'] || 0;
    acc.credicontado += advisor.byType['CREDICONTADO'] || 0;
    acc.credito += advisor.byType['CREDITO'] || 0;
    acc.aliados += advisor.byType['ALIADOS'] || 0;
    return acc;
  }, { contado: 0, credicontado: 0, credito: 0, aliados: 0 });

  const totalRow = worksheet.addRow(
    includeRegional
      ? {
          regional: '',
          posicion: '',
          cedula: '',
          nombre: 'TOTAL',
          tipoAsesor: '',
          contado: totals.contado,
          credicontado: totals.credicontado,
          credito: totals.credito,
          aliados: totals.aliados,
          totalVentas: totals.contado + totals.credicontado + totals.credito + totals.aliados,
        }
      : {
          posicion: '',
          cedula: '',
          nombre: 'TOTAL',
          tipoAsesor: '',
          contado: totals.contado,
          credicontado: totals.credicontado,
          credito: totals.credito,
          aliados: totals.aliados,
          totalVentas: totals.contado + totals.credicontado + totals.credito + totals.aliados,
        }
  );

  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Format number columns
  worksheet.getColumn('contado').numFmt = '#,##0';
  worksheet.getColumn('credicontado').numFmt = '#,##0';
  worksheet.getColumn('credito').numFmt = '#,##0';
  worksheet.getColumn('aliados').numFmt = '#,##0';
  worksheet.getColumn('totalVentas').numFmt = '#,##0';
}

function createRankingQuantitySheet(
  workbook: ExcelJS.Workbook,
  data: RankingAdvisor[],
  includeRegional: boolean
) {
  const worksheet = workbook.addWorksheet('Ranking (Q)');

  // Define columns based on whether regional is included
  if (includeRegional) {
    worksheet.columns = [
      { header: 'Regional', key: 'regional', width: 20 },
      { header: 'Posición', key: 'posicion', width: 10 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      { header: 'Contado Q', key: 'contadoQ', width: 12 },
      { header: 'Credi Contado Q', key: 'credicontadoQ', width: 15 },
      { header: 'Crédito Q', key: 'creditoQ', width: 12 },
      { header: 'Aliados Q', key: 'aliadosQ', width: 12 },
      { header: 'Total Q', key: 'totalQ', width: 12 },
    ];
  } else {
    worksheet.columns = [
      { header: 'Posición', key: 'posicion', width: 10 },
      { header: 'Cédula', key: 'cedula', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Tipo Asesor', key: 'tipoAsesor', width: 12 },
      { header: 'Contado Q', key: 'contadoQ', width: 12 },
      { header: 'Credi Contado Q', key: 'credicontadoQ', width: 15 },
      { header: 'Crédito Q', key: 'creditoQ', width: 12 },
      { header: 'Aliados Q', key: 'aliadosQ', width: 12 },
      { header: 'Total Q', key: 'totalQ', width: 12 },
    ];
  }

  // Style header row - Green for quantity
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF217346' }
  };

  // Add data rows
  data.forEach((advisor, index) => {
    const contadoQ = advisor.qtyByType?.['CONTADO'] || 0;
    const credicontadoQ = advisor.qtyByType?.['CREDICONTADO'] || 0;
    const creditoQ = advisor.qtyByType?.['CREDITO'] || 0;
    const aliadosQ = advisor.qtyByType?.['ALIADOS'] || 0;
    const totalQ = contadoQ + credicontadoQ + creditoQ + aliadosQ;

    if (includeRegional) {
      worksheet.addRow({
        regional: advisor.regional || '',
        posicion: index + 1,
        cedula: advisor.cedula || '',
        nombre: advisor.nombre,
        tipoAsesor: advisor.tipoAsesor,
        contadoQ,
        credicontadoQ,
        creditoQ,
        aliadosQ,
        totalQ,
      });
    } else {
      worksheet.addRow({
        posicion: index + 1,
        cedula: advisor.cedula || '',
        nombre: advisor.nombre,
        tipoAsesor: advisor.tipoAsesor,
        contadoQ,
        credicontadoQ,
        creditoQ,
        aliadosQ,
        totalQ,
      });
    }
  });

  // Add totals row
  const totals = data.reduce((acc, advisor) => {
    acc.contadoQ += advisor.qtyByType?.['CONTADO'] || 0;
    acc.credicontadoQ += advisor.qtyByType?.['CREDICONTADO'] || 0;
    acc.creditoQ += advisor.qtyByType?.['CREDITO'] || 0;
    acc.aliadosQ += advisor.qtyByType?.['ALIADOS'] || 0;
    return acc;
  }, { contadoQ: 0, credicontadoQ: 0, creditoQ: 0, aliadosQ: 0 });

  const totalRow = worksheet.addRow(
    includeRegional
      ? {
          regional: '',
          posicion: '',
          cedula: '',
          nombre: 'TOTAL',
          tipoAsesor: '',
          contadoQ: totals.contadoQ,
          credicontadoQ: totals.credicontadoQ,
          creditoQ: totals.creditoQ,
          aliadosQ: totals.aliadosQ,
          totalQ: totals.contadoQ + totals.credicontadoQ + totals.creditoQ + totals.aliadosQ,
        }
      : {
          posicion: '',
          cedula: '',
          nombre: 'TOTAL',
          tipoAsesor: '',
          contadoQ: totals.contadoQ,
          credicontadoQ: totals.credicontadoQ,
          creditoQ: totals.creditoQ,
          aliadosQ: totals.aliadosQ,
          totalQ: totals.contadoQ + totals.credicontadoQ + totals.creditoQ + totals.aliadosQ,
        }
  );

  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Format number columns
  worksheet.getColumn('contadoQ').numFmt = '#,##0';
  worksheet.getColumn('credicontadoQ').numFmt = '#,##0';
  worksheet.getColumn('creditoQ').numFmt = '#,##0';
  worksheet.getColumn('aliadosQ').numFmt = '#,##0';
  worksheet.getColumn('totalQ').numFmt = '#,##0';
}

export async function exportRankingToExcel({ data, includeRegional, fileName = 'ranking_ventas' }: ExportRankingOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-COM Sistema';
  workbook.created = new Date();

  // Create money sheet
  createRankingMoneySheet(workbook, data, includeRegional);

  // Create quantity sheet
  createRankingQuantitySheet(workbook, data, includeRegional);

  // Generate buffer and download
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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
