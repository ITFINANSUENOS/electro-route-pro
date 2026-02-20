

# Plan: Agregar Reporte de Consultas y Solicitudes en Ver Planillas

## Objetivo

Agregar un tercer sub-tab dentro de "Ver Planillas" llamado **"Ver Consultas"** que muestre, por cada asesor y por cada dia del mes, cuantas consultas y solicitudes reporto, y si no reporto nada, que quede claramente marcado.

---

## Estructura Visual

Un nuevo tab al lado de "Ver Listado" y "Ver Actividad":

```text
[Ver Listado]  [Ver Actividad]  [Ver Consultas]
```

### Cuadricula de Consultas

- **Filas**: Asesores (mismos filtros jerarquicos existentes)
- **Columnas**: Dias del mes (1 al 28/29/30/31)
- **Cada celda muestra**: "C/S" donde C = consultas, S = solicitudes del dia
  - Ejemplo: "5/2" = 5 consultas, 2 solicitudes
  - Si no reporto nada y estaba programado: celda roja con "--/--"
  - Si no estaba programado: celda gris sin contenido
  - Si reporto al menos algo: celda azul con los numeros
- **Columnas adicionales al final**: Totales del mes (Total Consultas, Total Solicitudes)

### Leyenda

- Azul: Reporto consultas/solicitudes
- Rojo: Estaba programado y no reporto
- Gris: No programado / dia futuro

### Exportacion Excel

Boton "Descargar Excel" que genera un archivo con:
- Filas: Nombre, Codigo del asesor
- Columnas: Cada dia del mes (2 sub-columnas: Consultas y Solicitudes)
- Columnas finales: Total Consultas, Total Solicitudes
- Celdas coloreadas igual que la interfaz

---

## Detalle Tecnico

### Archivos nuevos

1. **`src/components/actividades/ConsultasGrid.tsx`**
   - Recibe los mismos props que `AttendanceGrid` (profiles, month, year, daysInMonth)
   - Consulta `reportes_diarios` trayendo `user_id, fecha, consultas, solicitudes` para el rango del mes
   - Consulta `programacion` para saber quien estaba programado cada dia
   - Cruza ambas fuentes para construir la cuadricula
   - Usa ScrollArea horizontal (igual que AttendanceGrid)
   - Cada celda muestra "C/S" en formato compacto
   - Agrega columnas de totales al final de la fila

2. **`src/utils/exportConsultasExcel.ts`**
   - Genera Excel con ExcelJS (ya instalado)
   - Hoja "Consultas y Solicitudes"
   - Headers: Nombre, Codigo, luego cada dia con sub-headers Cons/Sol
   - Columnas finales: Total Consultas, Total Solicitudes
   - Colores: azul para dias con reporte, rojo para incumplimiento

### Archivos modificados

1. **`src/components/actividades/PlanillasViewer.tsx`**
   - Agregar import de `ConsultasGrid` y del icono `MessageSquare` de lucide
   - Agregar tercer tab "Ver Consultas" con icono de mensaje
   - Pasar los mismos props (filteredProfiles, month, year, daysInMonth)

### Datos utilizados

Los datos ya existen en la tabla `reportes_diarios`:
- `consultas` (integer, default 0)
- `solicitudes` (integer, default 0)
- `user_id`, `fecha`

No se requieren cambios en la base de datos ni nuevas tablas.

### Orden de implementacion

1. Crear `ConsultasGrid.tsx` con la cuadricula visual
2. Crear `exportConsultasExcel.ts` para la descarga
3. Modificar `PlanillasViewer.tsx` para agregar el tercer tab

