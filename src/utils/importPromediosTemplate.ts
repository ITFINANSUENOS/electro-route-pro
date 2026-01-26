import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

const TIPOS_VENTA_MAP: Record<string, string> = {
  'Contado': 'CONTADO',
  'CONTADO': 'CONTADO',
  'Credi Contado': 'CREDICONTADO',
  'CREDI CONTADO': 'CREDICONTADO',
  'CREDICONTADO': 'CREDICONTADO',
  'Crédito': 'CREDITO',
  'CRÉDITO': 'CREDITO',
  'CREDITO': 'CREDITO',
  'Convenio': 'CONVENIO',
  'CONVENIO': 'CONVENIO',
};

const TIPOS_ASESOR_MAP: Record<string, string> = {
  'Interno': 'INTERNO',
  'INTERNO': 'INTERNO',
  'Externo': 'EXTERNO',
  'EXTERNO': 'EXTERNO',
  'Corretaje': 'CORRETAJE',
  'CORRETAJE': 'CORRETAJE',
};

interface PromedioRow {
  regional_id: string;
  tipo_asesor: string;
  tipo_venta: string;
  valor_promedio: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export async function importPromediosFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find the Promedios sheet
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('promedio') || name === 'Promedios'
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la hoja de promedios'] });
          return;
        }

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { raw: true });
        
        if (jsonData.length === 0) {
          resolve({ success: false, imported: 0, errors: ['El archivo está vacío'] });
          return;
        }

        // Get column headers
        const firstRow = jsonData[0];
        const headers = Object.keys(firstRow);

        // Find required columns
        const regionalIdCol = headers.find(h => h.toLowerCase().includes('regional_id'));
        const tipoAsesorCol = headers.find(h => 
          h.toLowerCase().includes('tipo_asesor') || h.toLowerCase() === 'tipo asesor'
        );

        if (!regionalIdCol) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la columna REGIONAL_ID'] });
          return;
        }

        if (!tipoAsesorCol) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la columna TIPO_ASESOR'] });
          return;
        }

        // Find tipo venta columns
        const tipoVentaCols: { header: string; tipoVenta: string }[] = [];
        headers.forEach(header => {
          const normalized = TIPOS_VENTA_MAP[header];
          if (normalized) {
            tipoVentaCols.push({ header, tipoVenta: normalized });
          }
        });

        if (tipoVentaCols.length === 0) {
          resolve({ 
            success: false, 
            imported: 0, 
            errors: ['No se encontraron columnas de tipos de venta (Contado, Credi Contado, Crédito, Convenio)'] 
          });
          return;
        }

        // Process rows
        const promediosToInsert: PromedioRow[] = [];
        const errors: string[] = [];
        let rowNum = 2; // Excel rows start at 1, plus header

        for (const row of jsonData) {
          const regionalId = row[regionalIdCol]?.toString().trim();
          const tipoAsesorRaw = row[tipoAsesorCol]?.toString().trim();

          if (!regionalId || !tipoAsesorRaw) {
            errors.push(`Fila ${rowNum}: Falta REGIONAL_ID o TIPO_ASESOR`);
            rowNum++;
            continue;
          }

          const tipoAsesor = TIPOS_ASESOR_MAP[tipoAsesorRaw];
          if (!tipoAsesor) {
            errors.push(`Fila ${rowNum}: Tipo de asesor inválido: ${tipoAsesorRaw}`);
            rowNum++;
            continue;
          }

          // Process each tipo venta column
          for (const { header, tipoVenta } of tipoVentaCols) {
            const valorRaw = row[header];
            let valor = 0;

            if (valorRaw !== undefined && valorRaw !== null && valorRaw !== '') {
              // Handle string values with formatting
              if (typeof valorRaw === 'string') {
                const cleaned = valorRaw.replace(/[$.,\s]/g, '');
                valor = parseInt(cleaned, 10) || 0;
              } else {
                valor = Number(valorRaw) || 0;
              }
            }

            if (valor >= 0) {
              promediosToInsert.push({
                regional_id: regionalId,
                tipo_asesor: tipoAsesor,
                tipo_venta: tipoVenta,
                valor_promedio: valor,
              });
            }
          }

          rowNum++;
        }

        if (promediosToInsert.length === 0) {
          resolve({ 
            success: false, 
            imported: 0, 
            errors: errors.length > 0 ? errors : ['No se encontraron datos válidos para importar'] 
          });
          return;
        }

        // Upsert to database
        let importedCount = 0;
        for (const promedio of promediosToInsert) {
          const { error } = await supabase
            .from('config_metas_promedio')
            .upsert({
              regional_id: promedio.regional_id,
              tipo_asesor: promedio.tipo_asesor,
              tipo_venta: promedio.tipo_venta,
              valor_promedio: promedio.valor_promedio,
            }, {
              onConflict: 'regional_id,tipo_asesor,tipo_venta',
            });

          if (error) {
            errors.push(`Error al guardar ${promedio.tipo_asesor}/${promedio.tipo_venta}: ${error.message}`);
          } else {
            importedCount++;
          }
        }

        resolve({
          success: importedCount > 0,
          imported: importedCount,
          errors,
        });

      } catch (error) {
        console.error('Error processing file:', error);
        resolve({ 
          success: false, 
          imported: 0, 
          errors: ['Error al procesar el archivo Excel'] 
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, imported: 0, errors: ['Error al leer el archivo'] });
    };

    reader.readAsArrayBuffer(file);
  });
}
