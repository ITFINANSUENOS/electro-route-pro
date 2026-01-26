import ExcelJS from 'exceljs';
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
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        // Find the Promedios sheet
        let worksheet = workbook.getWorksheet('Promedios');
        if (!worksheet) {
          // Try to find by partial name match
          worksheet = workbook.worksheets.find(ws => 
            ws.name.toLowerCase().includes('promedio')
          );
        }
        if (!worksheet) {
          // Fall back to first non-instructions sheet
          worksheet = workbook.worksheets.find(ws => 
            !ws.name.toLowerCase().includes('instruc')
          ) || workbook.worksheets[0];
        }
        
        if (!worksheet) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la hoja de promedios'] });
          return;
        }

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers: Record<number, string> = {};
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value?.toString() || '';
        });

        // Find required column indices
        let regionalIdCol = 0;
        let tipoAsesorCol = 0;
        const tipoVentaCols: { colNumber: number; tipoVenta: string }[] = [];

        Object.entries(headers).forEach(([colStr, header]) => {
          const colNumber = parseInt(colStr);
          const headerLower = header.toLowerCase();
          
          if (headerLower.includes('regional_id')) {
            regionalIdCol = colNumber;
          } else if (headerLower.includes('tipo_asesor') || headerLower === 'tipo asesor') {
            tipoAsesorCol = colNumber;
          } else {
            const normalized = TIPOS_VENTA_MAP[header];
            if (normalized) {
              tipoVentaCols.push({ colNumber, tipoVenta: normalized });
            }
          }
        });

        if (!regionalIdCol) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la columna REGIONAL_ID'] });
          return;
        }

        if (!tipoAsesorCol) {
          resolve({ success: false, imported: 0, errors: ['No se encontró la columna TIPO_ASESOR'] });
          return;
        }

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

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const regionalId = row.getCell(regionalIdCol).value?.toString().trim();
          const tipoAsesorRaw = row.getCell(tipoAsesorCol).value?.toString().trim();

          if (!regionalId || !tipoAsesorRaw) {
            if (regionalId || tipoAsesorRaw) {
              errors.push(`Fila ${rowNumber}: Falta REGIONAL_ID o TIPO_ASESOR`);
            }
            return;
          }

          const tipoAsesor = TIPOS_ASESOR_MAP[tipoAsesorRaw];
          if (!tipoAsesor) {
            errors.push(`Fila ${rowNumber}: Tipo de asesor inválido: ${tipoAsesorRaw}`);
            return;
          }

          // Process each tipo venta column
          for (const { colNumber, tipoVenta } of tipoVentaCols) {
            const cellValue = row.getCell(colNumber).value;
            let valor = 0;

            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              if (typeof cellValue === 'number') {
                valor = cellValue;
              } else if (typeof cellValue === 'string') {
                const cleaned = cellValue.replace(/[$.,\s]/g, '');
                valor = parseInt(cleaned, 10) || 0;
              } else if (typeof cellValue === 'object' && 'result' in cellValue) {
                // Handle formula results
                valor = Number(cellValue.result) || 0;
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
        });

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
