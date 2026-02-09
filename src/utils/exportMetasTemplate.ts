import ExcelJS from 'exceljs';
import { dataService } from '@/services';
import { UserRole } from '@/types/auth';

export async function exportMetasTemplate(
  role: UserRole | null,
  regionalId: string | null,
  zona: string | null
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Build query based on role hierarchy
    let query = dataService
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
      const { data: zonalRegionales } = await (dataService
        .from('regionales')
        .select('id')
        .eq('zona', zona)
        .eq('activo', true) as any);
      
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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-COM Sistema';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Plantilla Metas');

    // Define columns
    worksheet.columns = [
      { header: 'REGIONAL', key: 'regional', width: 20 },
      { header: 'CC ASESOR', key: 'cedula', width: 15 },
      { header: 'CODIGO_ASESOR', key: 'codigo_asesor', width: 15 },
      { header: 'NOMBRE ASESOR', key: 'nombre', width: 35 },
      { header: 'CONTADO', key: 'contado', width: 15 },
      { header: 'CREDICONTADO', key: 'credicontado', width: 15 },
      { header: 'CRÉDITO', key: 'credito', width: 15 },
      { header: 'ALIADOS', key: 'aliados', width: 15 },
      { header: 'TOTAL', key: 'total', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    advisors.forEach((advisor: any, index: number) => {
      const rowNumber = index + 2;
      const regionalName = advisor.regionales?.nombre || 'SIN REGIONAL';
      
      worksheet.addRow({
        regional: regionalName,
        cedula: advisor.cedula || '',
        codigo_asesor: advisor.codigo_asesor || '',
        nombre: advisor.nombre_completo || '',
        contado: 0,
        credicontado: 0,
        credito: 0,
        aliados: 0,
        total: { formula: `SUM(E${rowNumber}:H${rowNumber})` },
      });
    });

    // Format number columns
    worksheet.getColumn('contado').numFmt = '#,##0';
    worksheet.getColumn('credicontado').numFmt = '#,##0';
    worksheet.getColumn('credito').numFmt = '#,##0';
    worksheet.getColumn('aliados').numFmt = '#,##0';
    worksheet.getColumn('total').numFmt = '#,##0';

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filename = `Plantilla_Metas_${dateStr}.xlsx`;

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

    return { success: true, count: advisors.length };
  } catch (error) {
    console.error('Error generating template:', error);
    return { success: false, count: 0, error: 'Error al generar la plantilla' };
  }
}
