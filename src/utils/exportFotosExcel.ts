import ExcelJS from 'exceljs';

interface PhotoRow {
  nombre: string;
  codigo: string;
  days: Record<number, { inicio?: string; instalacion?: string; cierre?: string; apertura?: string; cierre_punto?: string } | null>;
}

export async function exportFotosExcel(
  rows: PhotoRow[],
  month: number,
  year: number,
  daysInMonth: number,
  tipoActividad: 'correria' | 'punto'
) {
  const wb = new ExcelJS.Workbook();

  if (tipoActividad === 'correria') {
    // Three sheets for correría
    const types = [
      { key: 'inicio', label: 'Inicio' },
      { key: 'instalacion', label: 'Instalación' },
      { key: 'cierre', label: 'Cierre' },
    ];

    for (const { key, label } of types) {
      const ws = wb.addWorksheet(label);
      const headers = ['Nombre', 'Código'];
      for (let d = 1; d <= daysInMonth; d++) headers.push(String(d));
      
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      rows.forEach(row => {
        const values: (string | null)[] = [row.nombre, row.codigo];
        for (let d = 1; d <= daysInMonth; d++) {
          const dayData = row.days[d];
          values.push(dayData?.[key as keyof typeof dayData] || (dayData ? '00:00' : ''));
        }
        const dataRow = ws.addRow(values);
        for (let d = 1; d <= daysInMonth; d++) {
          const cell = dataRow.getCell(d + 2);
          cell.alignment = { horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          const val = cell.value as string;
          if (val === '00:00') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
          } else if (val && val !== '') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };
          }
        }
      });

      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 12;
      for (let d = 1; d <= daysInMonth; d++) ws.getColumn(d + 2).width = 7;
    }
  } else {
    // Two sheets for punto fijo
    const types = [
      { key: 'apertura', label: 'Apertura' },
      { key: 'cierre_punto', label: 'Cierre' },
    ];

    for (const { key, label } of types) {
      const ws = wb.addWorksheet(label);
      const headers = ['Nombre', 'Código'];
      for (let d = 1; d <= daysInMonth; d++) headers.push(String(d));
      
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      rows.forEach(row => {
        const values: (string | null)[] = [row.nombre, row.codigo];
        for (let d = 1; d <= daysInMonth; d++) {
          const dayData = row.days[d];
          values.push(dayData?.[key as keyof typeof dayData] || (dayData ? '00:00' : ''));
        }
        const dataRow = ws.addRow(values);
        for (let d = 1; d <= daysInMonth; d++) {
          const cell = dataRow.getCell(d + 2);
          cell.alignment = { horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          const val = cell.value as string;
          if (val === '00:00') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
          } else if (val && val !== '') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };
          }
        }
      });

      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 12;
      for (let d = 1; d <= daysInMonth; d++) ws.getColumn(d + 2).width = 7;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Planilla_Fotos_${tipoActividad}_${year}-${String(month).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
