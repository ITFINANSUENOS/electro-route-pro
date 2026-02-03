
# Plan: Integración de Mapas con Leaflet.js + OpenStreetMap

## Resumen Ejecutivo
Implementaremos un sistema completo de visualización de mapas usando **Leaflet.js** con tiles de **OpenStreetMap**, reemplazando el placeholder de Google Maps. El mapa mostrará las ubicaciones GPS registradas en las evidencias de actividades con información completa y filtros avanzados.

## Arquitectura de la Solución

```text
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENTES DE MAPA                        │
├─────────────────────────────────────────────────────────────────┤
│  MapaUbicacion.tsx     → Componente base reutilizable           │
│  MapaOperaciones.tsx   → Mapa principal con múltiples markers   │
│  EvidenceMarker.tsx    → Popup con datos del asesor/actividad   │
│  MapFilters.tsx        → Filtros de fecha, regional, tipo       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UBICACIONES DE USO                           │
├─────────────────────────────────────────────────────────────────┤
│  /mapa                 → Mapa principal de operaciones          │
│  ActivityDetailDialog  → Mini-mapa en detalle de actividad      │
│  ActividadesViewer     → Mapa de evidencias registradas         │
└─────────────────────────────────────────────────────────────────┘
```

## Cambios a Implementar

### 1. Instalación de Dependencias
- `leaflet` - Librería principal de mapas
- `react-leaflet` - Wrapper para React
- `@types/leaflet` - Tipos TypeScript

### 2. Componentes Nuevos a Crear

**2.1 `src/components/ui/MapaUbicacion.tsx`**
Componente base reutilizable para mostrar un punto único:
- Props: `lat`, `lng`, `zoom?`, `popup?`
- Usa tiles de OpenStreetMap
- Estilos responsivos con Tailwind

**2.2 `src/components/map/MapaOperaciones.tsx`**
Mapa principal con múltiples marcadores:
- Consulta `reportes_diarios` para obtener coordenadas GPS
- Agrupa marcadores por proximidad (clustering)
- Colores por estado: verde (evidencia completa), amarillo (parcial), rojo (sin foto)

**2.3 `src/components/map/EvidenceMarker.tsx`**
Popup informativo en cada marcador:
```text
┌──────────────────────────────┐
│ 👤 Juan Pérez                │
│ 📍 Popayán Centro            │
│ 🏷️ Correría                  │
│ 🕐 10:45 AM - 26/01/2026     │
│ ✅ Evidencia completa        │
└──────────────────────────────┘
```

**2.4 `src/components/map/MapFilters.tsx`**
Panel de filtros reutilizable:
- Fecha: Selector de rango con DatePicker
- Regional: Multi-select (solo coordinador/admin)
- Jefe de Ventas: Dropdown filtrado por regional
- Tipo de Actividad: Punto Fijo / Correría / Libre

**2.5 `src/hooks/useMapLocations.ts`**
Hook para obtener y filtrar ubicaciones:
- Query a `reportes_diarios` con joins a `profiles` y `programacion`
- Respeta la jerarquía de roles (aislamiento regional)
- Retorna array de marcadores con metadata

### 3. Páginas a Modificar

**3.1 `src/pages/Mapa.tsx`**
- Eliminar placeholder mock
- Integrar `MapaOperaciones` con filtros completos
- Panel lateral con lista de ubicaciones activas
- Centro inicial: Popayán, Colombia (lat: 2.4419, lng: -76.6061)

**3.2 `src/components/programacion/ActivityDetailDialog.tsx`**
- Agregar mini-mapa debajo de "Asesores asignados"
- Mostrar marcadores de evidencia para cada asesor que ya reportó
- Solo visible si hay al menos un reporte con GPS

**3.3 `src/components/actividades/ActividadesViewer.tsx`**
- Agregar tab "Mapa" junto a la lista existente
- Mostrar mapa con todas las evidencias filtradas
- Click en marcador abre detalle de actividad

### 4. Estilos CSS Requeridos
En `src/index.css`:
```css
@import 'leaflet/dist/leaflet.css';

/* Fix para iconos de Leaflet en Vite */
.leaflet-default-icon-path {
  background-image: url('/marker-icon.png');
}

/* Estilos custom para marcadores de estado */
.marker-success { ... }
.marker-warning { ... }
.marker-danger { ... }
```

## Detalles Técnicos

### Estructura de Datos del Marcador
```typescript
interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  user_id: string;
  user_name: string;
  fecha: string;
  hora_registro: string;
  tipo_actividad: 'punto' | 'correria' | 'libre';
  municipio: string;
  has_photo: boolean;
  has_gps: boolean;
  regional_id?: string;
  regional_name?: string;
}
```

### Configuración del Mapa
```typescript
const mapConfig = {
  center: [2.4419, -76.6061], // Popayán
  zoom: 10,
  minZoom: 6,
  maxZoom: 18,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
};
```

### Marcadores Personalizados por Estado
```text
🟢 Verde  → Evidencia completa (foto + GPS para correría, solo GPS para punto)
🟡 Amarillo → Evidencia parcial (falta foto o GPS)
🔴 Rojo → Sin evidencia
```

## Consideraciones de Seguridad
- Los filtros respetan la jerarquía de roles existente
- Asesores solo ven sus propias ubicaciones
- Jefes ven su equipo
- Líderes ven su regional
- Coordinadores/Admin ven todo

## Archivos a Crear
1. `src/components/ui/MapaUbicacion.tsx`
2. `src/components/map/MapaOperaciones.tsx`
3. `src/components/map/EvidenceMarker.tsx`
4. `src/components/map/MapFilters.tsx`
5. `src/hooks/useMapLocations.ts`

## Archivos a Modificar
1. `src/pages/Mapa.tsx` - Reemplazar placeholder
2. `src/components/programacion/ActivityDetailDialog.tsx` - Agregar mini-mapa
3. `src/components/actividades/ActividadesViewer.tsx` - Agregar tab de mapa
4. `src/index.css` - Importar estilos de Leaflet
5. `package.json` - Agregar dependencias

## Orden de Implementación
1. Instalar dependencias (leaflet, react-leaflet)
2. Crear componente base `MapaUbicacion.tsx`
3. Crear hook `useMapLocations.ts`
4. Crear `MapaOperaciones.tsx` con filtros
5. Actualizar página `/mapa`
6. Integrar mini-mapa en `ActivityDetailDialog`
7. Agregar tab de mapa en `ActividadesViewer`
8. Pruebas de responsividad móvil

## Resultado Esperado
- Mapa interactivo funcional sin necesidad de API keys
- Visualización en tiempo real de ubicaciones de evidencias
- Filtros completos por fecha, regional, jefe y tipo
- Mini-mapas en detalles de actividades
- Diseño responsive para móvil y escritorio
