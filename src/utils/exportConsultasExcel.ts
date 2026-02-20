import ExcelJS from 'exceljs';

interface ConsultasRow {
  nombre: string;
  codigo: string;
  userId: string;
  days: Record<number, { c: number; s: number } | 'missing' | null>;
  totalC: number;
  totalS: number;
}

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function exportConsultasExcel(data: ConsultasRow[], month: number, year: number, daysInMonth: number) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Consultas y Solicitudes');

  // Header row 1: Nombre, Codigo, then day numbers
  const header1: string[] = ['Nombre', 'Código'];
  for (let d = 1; d <= daysInMonth; d++) header1.push(String(d));
  header1.push('Total C', 'Total S');
  ws.addRow(header1);

  // Style header
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 10 };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Data rows
  const blueFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  const redFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };

  data.forEach(row => {
    const values: (string | number)[] = [row.nombre, row.codigo];
    for (let d = 1; d <= daysInMonth; d++) {
      const val = row.days[d];
      if (val === null) values.push('');
      else if (val === 'missing') values.push('--/--');
      else values.push(`${val.c}/${val.s}`);
    }
    values.push(row.totalC, row.totalS);

    const excelRow = ws.addRow(values);
    excelRow.font = { size: 9 };
    excelRow.alignment = { horizontal: 'center' };
    excelRow.getCell(1).alignment = { horizontal: 'left' };

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = excelRow.getCell(d + 2);
      const val = row.days[d];
      if (val === 'missing') cell.fill = redFill;
      else if (val !== null) cell.fill = blueFill;
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
  });

  // Column widths
  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 10;
  for (let i = 3; i <= daysInMonth + 2; i++) ws.getColumn(i).width = 7;
  ws.getColumn(daysInMonth + 3).width = 9;
  ws.getColumn(daysInMonth + 4).width = 9;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Consultas_${months[month - 1]}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
