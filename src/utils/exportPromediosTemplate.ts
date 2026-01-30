import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'] as const;
const TIPOS_VENTA = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'ALIADOS'] as const;

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  ALIADOS: 'Aliados',
};

const tiposAsesorLabels: Record<string, string> = {
  INTERNO: 'Interno',
  EXTERNO: 'Externo',
  CORRETAJE: 'Corretaje',
};

interface Regional {
  id: string;
  nombre: string;
  codigo: number;
  zona: string | null;
}

interface PromedioData {
  regional_id: string;
  tipo_asesor: string;
  tipo_venta: string;
  valor_promedio: number;
}

export async function exportPromediosTemplate(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Fetch active regionales (excluding 106 Puerto Tejada which merges with 103 Santander)
    const { data: regionales, error: regError } = await supabase
      .from('regionales')
      .select('id, nombre, codigo, zona')
      .eq('activo', true)
      .neq('codigo', 106) // Exclude Puerto Tejada (merges with Santander)
      .order('codigo');

    if (regError) {
      console.error('Error fetching regionales:', regError);
      return { success: false, count: 0, error: regError.message };
    }

    if (!regionales || regionales.length === 0) {
      return { success: false, count: 0, error: 'No se encontraron regionales activas' };
    }

    // Fetch existing promedio values
    const { data: promedios, error: promError } = await supabase
      .from('config_metas_promedio')
      .select('*');

    if (promError) {
      console.error('Error fetching promedios:', promError);
    }

    // Create lookup for existing values
    const promedioLookup: Record<string, number> = {};
    promedios?.forEach((p: PromedioData) => {
      const key = `${p.regional_id}-${p.tipo_asesor}-${p.tipo_venta}`;
      promedioLookup[key] = p.valor_promedio;
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-COM Sistema';
    workbook.created = new Date();

    // Add instructions sheet
    const instrSheet = workbook.addWorksheet('Instrucciones');
    instrSheet.columns = [{ width: 80 }];
    
    const instrucciones = [
      ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE PROMEDIOS'],
      [''],
      ['1. No modifique las columnas REGIONAL_ID, CODIGO, REGIONAL, ZONA ni TIPO_ASESOR'],
      ['2. Solo edite los valores en las columnas: Contado, Credi Contado, Crédito, Aliados'],
      ['3. Los valores deben ser números enteros (sin decimales ni símbolos de moneda)'],
      ['4. Ejemplo: 2895000 (NO $2.895.000)'],
      ['5. Cada regional tiene 3 filas: una por cada tipo de asesor (Interno, Externo, Corretaje)'],
      ['6. Guarde el archivo como .xlsx antes de subirlo'],
      [''],
      ['NOTA: Santander (103) incluye Puerto Tejada (106) - use los valores combinados'],
    ];
    
    instrucciones.forEach((row, index) => {
      instrSheet.addRow(row);
      if (index === 0) {
        instrSheet.getRow(1).font = { bold: true, size: 14 };
      }
    });

    // Add data sheet
    const dataSheet = workbook.addWorksheet('Promedios');
    
    // Define columns
    dataSheet.columns = [
      { header: 'REGIONAL_ID', key: 'regional_id', width: 40 },
      { header: 'CODIGO', key: 'codigo', width: 8 },
      { header: 'REGIONAL', key: 'regional', width: 20 },
      { header: 'ZONA', key: 'zona', width: 10 },
      { header: 'TIPO_ASESOR', key: 'tipo_asesor', width: 12 },
      { header: tiposVentaLabels.CONTADO, key: 'contado', width: 15 },
      { header: tiposVentaLabels.CREDICONTADO, key: 'credicontado', width: 15 },
      { header: tiposVentaLabels.CREDITO, key: 'credito', width: 15 },
      { header: tiposVentaLabels.ALIADOS, key: 'aliados', width: 15 },
    ];

    // Style header row
    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    regionales.forEach((regional: Regional) => {
      TIPOS_ASESOR.forEach(tipoAsesor => {
        const row = {
          regional_id: regional.id,
          codigo: regional.codigo,
          regional: regional.nombre,
          zona: regional.zona || '',
          tipo_asesor: tiposAsesorLabels[tipoAsesor],
          contado: promedioLookup[`${regional.id}-${tipoAsesor}-CONTADO`] || 0,
          credicontado: promedioLookup[`${regional.id}-${tipoAsesor}-CREDICONTADO`] || 0,
          credito: promedioLookup[`${regional.id}-${tipoAsesor}-CREDITO`] || 0,
          aliados: promedioLookup[`${regional.id}-${tipoAsesor}-ALIADOS`] || 0,
        };
        dataSheet.addRow(row);
      });
    });

    // Format number columns
    dataSheet.getColumn('contado').numFmt = '#,##0';
    dataSheet.getColumn('credicontado').numFmt = '#,##0';
    dataSheet.getColumn('credito').numFmt = '#,##0';
    dataSheet.getColumn('aliados').numFmt = '#,##0';

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `Plantilla_Promedios_${dateStr}.xlsx`;

    // Generate buffer and download
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

    return { success: true, count: regionales.length };
  } catch (error) {
    console.error('Error generating template:', error);
    return { success: false, count: 0, error: 'Error al generar la plantilla' };
  }
}
