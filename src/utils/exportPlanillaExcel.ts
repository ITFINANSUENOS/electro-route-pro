import ExcelJS from 'exceljs';

interface AttendanceRow {
  nombre: string;
  codigo: string;
  days: Record<number, 1 | 0 | null>; // 1=GPS, 0=no GPS, null=no programado
}

export async function exportPlanillaExcel(
  rows: AttendanceRow[],
  month: number,
  year: number,
  daysInMonth: number
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Asistencia GPS');

  // Header row
  const headers = ['Nombre', 'Código'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };

  // Style header
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Data rows
  rows.forEach(row => {
    const values: (string | number | null)[] = [row.nombre, row.codigo];
    for (let d = 1; d <= daysInMonth; d++) {
      const val = row.days[d];
      values.push(val === null ? '' as any : val);
    }
    const dataRow = ws.addRow(values);

    // Color cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = dataRow.getCell(d + 2);
      const val = row.days[d];
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

      if (val === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };
      } else if (val === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
      }
    }
  });

  // Column widths
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 12;
  for (let d = 1; d <= daysInMonth; d++) {
    ws.getColumn(d + 2).width = 5;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Planilla_Asistencia_${year}-${String(month).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
