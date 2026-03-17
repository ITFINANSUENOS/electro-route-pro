

## Fix: Dropdowns de filtros del mapa aparecen detrás del mapa

### Causa
El contenedor del mapa Leaflet usa `z-index` internos altos (400+). Los `SelectContent` de Radix se renderizan en un portal pero la carta de filtros no tiene un z-index superior, y el `overflow-hidden` en el `CardContent` del mapa puede interferir visualmente.

### Solución

**1. `src/components/map/MapFilters.tsx`**
- Agregar `className="relative z-20"` al `<Card>` contenedor de filtros para que sus dropdowns queden por encima del mapa.

**2. `src/pages/Mapa.tsx`**
- Agregar `relative z-10` al contenedor `<Card>` del mapa para asegurar que quede por debajo de los filtros en el stacking context.

Son cambios mínimos de 2 líneas CSS.

