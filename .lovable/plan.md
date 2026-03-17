

# Plan: Incluir asesores inactivos en toda la reporteria financiera

## Problema

Cuando un asesor es desactivado durante el mes, sus metas, ventas y devoluciones desaparecen de los totales porque las consultas de perfiles filtran con `activo = true`. Esto causa que el total de metas mostrado no coincida con lo cargado ($5.702.800.000), y que ventas/devoluciones de asesores que salieron de la compania se pierdan de los graficos y reportes.

## Principio

Separar logica **financiera** (metas, ventas, devoluciones, presupuestos) de logica **operativa** (conteo de asesores activos, login, programacion):
- **Financiero**: incluir TODOS los asesores con metas/ventas en el periodo, activos e inactivos
- **Operativo**: seguir usando `activo = true` solo para conteos de personal activo

## Cambios planificados

### 1. `src/hooks/useRegionalesData.ts` (linea 97)
- Quitar `.eq('activo', true)` del query de perfiles para mapeo `codigo_asesor -> regional_id`
- Agregar `activo` al select: `'codigo_asesor, regional_id, activo'`
- Resultado: metas y ventas de asesores inactivos se atribuyen correctamente a su regional

### 2. `src/components/dashboard/DashboardLider.tsx` (linea 710)
- Cambiar `if (!p.activo || !p.codigo_asesor) return;` por `if (!p.codigo_asesor) return;` para incluir codigos de asesores inactivos en el scope de metas
- Mantener `activo = true` en linea 739 para el conteo de `totalActiveAdvisors` (esto es operativo)
- Agregar campo `activo` a la estructura de `byAdvisor` para que el ranking pueda mostrar el estado visual
- Los mapas `tipoAsesorMap` y `regionalMap` (linea 536) ya incluyen todos los perfiles sin filtro de activo, lo cual es correcto

### 3. `src/components/dashboard/DashboardJefe.tsx` (linea 134)
- Quitar `.eq('activo', true)` del query de perfiles del equipo
- Agregar `activo` al select: `'codigo_asesor, nombre_completo, tipo_asesor, cedula, activo'`
- Asesores inactivos del equipo aparecen en el ranking con sus ventas, devoluciones y metas

### 4. `src/hooks/useComparativeData.ts` (linea 183)
- Quitar `.eq('activo', true)` del query de perfiles
- Agregar `activo` al select
- Datos comparativos incluyen ventas/devoluciones de asesores inactivos en el breakdown por tipo

### 5. `src/components/dashboard/RankingTable.tsx`
- Agregar campo `activo?: boolean` a la interfaz `RankingAdvisor` (linea 32)
- En la celda del nombre: si `activo === false`, aplicar estilo gris (`text-muted-foreground opacity-60`) y mostrar un badge pequeno "Inactivo" al lado del nombre
- El asesor sigue visible con todos sus datos (ventas, devoluciones, meta, cumplimiento)

### 6. `src/components/informacion/MetasTab.tsx`
- Agregar `activo` al select del query de profiles (linea 118): `'codigo_asesor, nombre_completo, tipo_asesor, regional_id, activo'`
- Agregar `activo` a la interfaz `ProfileWithRegional`
- En la tabla de metas por asesor, mostrar indicador "Inactivo" en gris para asesores desactivados

### 7. `src/components/regionales/RegionalesRankingTable.tsx`
- Sin cambios necesarios: esta tabla muestra datos agregados por regional, no por asesor individual. El fix en `useRegionalesData.ts` (#1) es suficiente para que los totales incluyan asesores inactivos.

## Flujo de datos despues del fix

```text
CSV Metas (126 asesores, $5.702.800.000)
  → tabla metas (126 registros) ✓ ya funciona
  → query perfiles SIN filtro activo
  → mapeo codigo_asesor → regional_id COMPLETO
  → Totales Dashboard/Regionales = $5.702.800.000 ✓

Ventas/Devoluciones de asesores inactivos
  → query ventas (no filtra por activo) ✓ ya funciona
  → mapeo a tipo_asesor/regional via perfiles SIN filtro activo
  → Aparecen en graficos y tablas con badge "Inactivo"
```

## Sin cambios en base de datos

No se requieren migraciones. Es puramente un ajuste en la capa de consultas y visualizacion del frontend.

