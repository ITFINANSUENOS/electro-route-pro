import * as XLSX from 'xlsx';

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

export function exportRankingToExcel({ data, includeRegional, fileName = 'ranking_ventas' }: ExportRankingOptions) {
  const rows = data.map((advisor, index) => {
    const contado = Math.abs(advisor.byType['CONTADO'] || 0);
    const credicontado = Math.abs(advisor.byType['CREDICONTADO'] || 0);
    const credito = Math.abs(advisor.byType['CREDITO'] || 0);
    const convenio = Math.abs(advisor.byType['CONVENIO'] || 0);
    const totalVentas = contado + credicontado + credito + convenio;

    if (includeRegional) {
      return {
        'Regional': advisor.regional || '',
        'Posición': index + 1,
        'Cédula': advisor.cedula || '',
        'Nombre': advisor.nombre,
        'Tipo Asesor': advisor.tipoAsesor,
        'Contado': contado,
        'Credi Contado': credicontado,
        'Crédito': credito,
        'Convenio': convenio,
        'Total Ventas': totalVentas,
      };
    }

    return {
      'Posición': index + 1,
      'Cédula': advisor.cedula || '',
      'Nombre': advisor.nombre,
      'Tipo Asesor': advisor.tipoAsesor,
      'Contado': contado,
      'Credi Contado': credicontado,
      'Crédito': credito,
      'Convenio': convenio,
      'Total Ventas': totalVentas,
    };
  });

  // Add total row
  const totals = data.reduce((acc, advisor) => {
    acc.contado += Math.abs(advisor.byType['CONTADO'] || 0);
    acc.credicontado += Math.abs(advisor.byType['CREDICONTADO'] || 0);
    acc.credito += Math.abs(advisor.byType['CREDITO'] || 0);
    acc.convenio += Math.abs(advisor.byType['CONVENIO'] || 0);
    return acc;
  }, { contado: 0, credicontado: 0, credito: 0, convenio: 0 });

  const totalRow = includeRegional
    ? {
        'Regional': '',
        'Posición': '',
        'Cédula': '',
        'Nombre': 'TOTAL',
        'Tipo Asesor': '',
        'Contado': totals.contado,
        'Credi Contado': totals.credicontado,
        'Crédito': totals.credito,
        'Convenio': totals.convenio,
        'Total Ventas': totals.contado + totals.credicontado + totals.credito + totals.convenio,
      }
    : {
        'Posición': '',
        'Cédula': '',
        'Nombre': 'TOTAL',
        'Tipo Asesor': '',
        'Contado': totals.contado,
        'Credi Contado': totals.credicontado,
        'Crédito': totals.credito,
        'Convenio': totals.convenio,
        'Total Ventas': totals.contado + totals.credicontado + totals.credito + totals.convenio,
      };

  rows.push(totalRow as any);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ranking');

  // Auto-size columns
  const maxWidth = 20;
  const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: maxWidth }));
  worksheet['!cols'] = colWidths;

  // Download
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${date}.xlsx`);
}

export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
