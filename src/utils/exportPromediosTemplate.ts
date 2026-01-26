import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

const TIPOS_ASESOR = ['INTERNO', 'EXTERNO', 'CORRETAJE'] as const;
const TIPOS_VENTA = ['CONTADO', 'CREDICONTADO', 'CREDITO', 'CONVENIO'] as const;

const tiposVentaLabels: Record<string, string> = {
  CONTADO: 'Contado',
  CREDICONTADO: 'Credi Contado',
  CREDITO: 'Crédito',
  CONVENIO: 'Convenio',
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

    // Build Excel data
    const excelData: (string | number)[][] = [];

    // Header row
    excelData.push([
      'REGIONAL_ID', 
      'CODIGO', 
      'REGIONAL', 
      'ZONA',
      'TIPO_ASESOR',
      ...TIPOS_VENTA.map(tv => tiposVentaLabels[tv])
    ]);

    // Data rows - one row per regional per tipo asesor
    regionales.forEach((regional: Regional) => {
      TIPOS_ASESOR.forEach(tipoAsesor => {
        const row: (string | number)[] = [
          regional.id,
          regional.codigo,
          regional.nombre,
          regional.zona || '',
          tiposAsesorLabels[tipoAsesor],
        ];

        // Add value for each tipo venta
        TIPOS_VENTA.forEach(tipoVenta => {
          const key = `${regional.id}-${tipoAsesor}-${tipoVenta}`;
          const valor = promedioLookup[key] || 0;
          row.push(valor);
        });

        excelData.push(row);
      });
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // REGIONAL_ID (hidden in practice)
      { wch: 8 },  // CODIGO
      { wch: 20 }, // REGIONAL
      { wch: 10 }, // ZONA
      { wch: 12 }, // TIPO_ASESOR
      { wch: 15 }, // CONTADO
      { wch: 15 }, // CREDICONTADO
      { wch: 15 }, // CRÉDITO
      { wch: 15 }, // CONVENIO
    ];

    // Add instructions sheet
    const instrucciones = [
      ['INSTRUCCIONES PARA LLENAR LA PLANTILLA DE PROMEDIOS'],
      [''],
      ['1. No modifique las columnas REGIONAL_ID, CODIGO, REGIONAL, ZONA ni TIPO_ASESOR'],
      ['2. Solo edite los valores en las columnas: Contado, Credi Contado, Crédito, Convenio'],
      ['3. Los valores deben ser números enteros (sin decimales ni símbolos de moneda)'],
      ['4. Ejemplo: 2895000 (NO $2.895.000)'],
      ['5. Cada regional tiene 3 filas: una por cada tipo de asesor (Interno, Externo, Corretaje)'],
      ['6. Guarde el archivo como .xlsx antes de subirlo'],
      [''],
      ['NOTA: Santander (103) incluye Puerto Tejada (106) - use los valores combinados'],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstr['!cols'] = [{ wch: 80 }];

    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');
    XLSX.utils.book_append_sheet(wb, ws, 'Promedios');

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `Plantilla_Promedios_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    return { success: true, count: regionales.length };
  } catch (error) {
    console.error('Error generating template:', error);
    return { success: false, count: 0, error: 'Error al generar la plantilla' };
  }
}
