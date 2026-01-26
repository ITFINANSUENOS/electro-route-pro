import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';

interface AdvisorData {
  regional_nombre: string;
  ccosto_asesor: string;
  codigo_asesor: string;
  nombre_completo: string;
}

export async function exportMetasTemplate(
  role: UserRole | null,
  regionalId: string | null,
  zona: string | null
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Build query based on role hierarchy
    let query = supabase
      .from('profiles')
      .select(`
        nombre_completo,
        codigo_asesor,
        cedula,
        regional_id,
        regionales!profiles_regional_id_fkey (
          nombre,
          zona
        )
      `)
      .eq('activo', true)
      .not('codigo_asesor', 'is', null)
      .neq('codigo_asesor', '00001');

    // Apply hierarchical filters based on role
    if (role === 'administrador') {
      // Admin sees all 156 active advisors - no additional filter
    } else if (role === 'coordinador_comercial' && zona) {
      // Coordinator sees advisors in their zone (norte/sur)
      // Need to get regionales for this zone first
      const { data: zonalRegionales } = await supabase
        .from('regionales')
        .select('id')
        .eq('zona', zona)
        .eq('activo', true);
      
      if (zonalRegionales && zonalRegionales.length > 0) {
        const regionalIds = zonalRegionales.map(r => r.id);
        query = query.in('regional_id', regionalIds);
      }
    } else if ((role === 'lider_zona' || role === 'jefe_ventas') && regionalId) {
      // Leader/Manager sees only their regional advisors
      query = query.eq('regional_id', regionalId);
    } else {
      return { success: false, count: 0, error: 'No tienes permisos para descargar la plantilla' };
    }

    const { data: advisors, error } = await query.order('nombre_completo');

    if (error) {
      console.error('Error fetching advisors:', error);
      return { success: false, count: 0, error: error.message };
    }

    if (!advisors || advisors.length === 0) {
      return { success: false, count: 0, error: 'No se encontraron asesores activos' };
    }

    // Transform data for Excel
    const excelData: (string | number)[][] = [
      ['REGIONAL', 'CC ASESOR', 'CODIGO_ASESOR', 'NOMBRE ASESOR', 'CONTADO', 'CREDICONTADO', 'CRÉDITO', 'CONVENIO', 'TOTAL']
    ];

    advisors.forEach((advisor: any) => {
      const regionalName = advisor.regionales?.nombre || 'SIN REGIONAL';
      excelData.push([
        regionalName,
        advisor.cedula || '',
        advisor.codigo_asesor || '',
        advisor.nombre_completo || '',
        0, // CONTADO - empty for user to fill
        0, // CREDICONTADO
        0, // CRÉDITO
        0, // CONVENIO
        0  // TOTAL (formula will be added)
      ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // REGIONAL
      { wch: 15 }, // CC ASESOR
      { wch: 15 }, // CODIGO_ASESOR
      { wch: 35 }, // NOMBRE ASESOR
      { wch: 15 }, // CONTADO
      { wch: 15 }, // CREDICONTADO
      { wch: 15 }, // CRÉDITO
      { wch: 15 }, // CONVENIO
      { wch: 15 }, // TOTAL
    ];

    // Add formulas for TOTAL column (column I = sum of E:H)
    for (let row = 2; row <= advisors.length + 1; row++) {
      const cellRef = `I${row}`;
      ws[cellRef] = { t: 'n', f: `SUM(E${row}:H${row})` };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Metas');

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filename = `Plantilla_Metas_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    return { success: true, count: advisors.length };
  } catch (error) {
    console.error('Error generating template:', error);
    return { success: false, count: 0, error: 'Error al generar la plantilla' };
  }
}
