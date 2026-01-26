import ExcelJS from 'exceljs';

export interface RankingAdvisor {
  codigo: string;
  nombre: string;
  tipoAsesor: string;
  cedula?: string;
  regional?: string;
  total: number;
  byType: Record<string, number>;
}

interface ExportRankingOptions {
  data: RankingAdvisor[];
  includeRegional: boolean;
  fileName?: string;
}

export async function exportRankingToExcel({ data, includeRegional, fileName = 'ranking_ventas' }: ExportRankingOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-COM Sistema';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Ranking');

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
      { header: 'Convenio', key: 'convenio', width: 15 },
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
      { header: 'Convenio', key: 'convenio', width: 15 },
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
    const convenio = advisor.byType['CONVENIO'] || 0;
    const totalVentas = contado + credicontado + credito + convenio;

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
        convenio,
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
        convenio,
        totalVentas,
      });
    }
  });

  // Add totals row
  const totals = data.reduce((acc, advisor) => {
    acc.contado += advisor.byType['CONTADO'] || 0;
    acc.credicontado += advisor.byType['CREDICONTADO'] || 0;
    acc.credito += advisor.byType['CREDITO'] || 0;
    acc.convenio += advisor.byType['CONVENIO'] || 0;
    return acc;
  }, { contado: 0, credicontado: 0, credito: 0, convenio: 0 });

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
          convenio: totals.convenio,
          totalVentas: totals.contado + totals.credicontado + totals.credito + totals.convenio,
        }
      : {
          posicion: '',
          cedula: '',
          nombre: 'TOTAL',
          tipoAsesor: '',
          contado: totals.contado,
          credicontado: totals.credicontado,
          credito: totals.credito,
          convenio: totals.convenio,
          totalVentas: totals.contado + totals.credicontado + totals.credito + totals.convenio,
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
  worksheet.getColumn('convenio').numFmt = '#,##0';
  worksheet.getColumn('totalVentas').numFmt = '#,##0';

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
