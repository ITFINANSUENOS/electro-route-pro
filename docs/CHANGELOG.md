# Changelog - Sistema E-COM

Todos los cambios notables del proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [MVP 1.0.0] - 2026-01-27

### ✅ Funcionalidades Implementadas

#### Autenticación
- Login dual (Cédula o Email)
- Sistema de roles jerárquicos (6 niveles)
- Contexto de autenticación con permisos

#### Dashboard
- **Asesor**: KPIs personales, posición en ranking regional y de grupo
- **Jefe de Ventas**: Métricas de equipo, ranking de asesores, incumplimientos
- **Líder de Zona**: Dashboard regional con filtros avanzados
- Tooltips con desglose de ventas por tipo
- Cantidad de ventas únicas (Q Ventas)
- Indicadores de cumplimiento con detalle por asesor

#### Programación
- Calendario mensual con actividades agrupadas
- Creación de actividades (Punto Fijo, Correría, Libre)
- Multi-selección de asesores
- Integración con Google Maps para ubicación
- Días de bloqueo configurables
- Visibilidad de compañeros en misma actividad

#### Actividades
- Registro de evidencia con foto y GPS
- Ventana de reporte configurable (4pm-9pm)
- Registro de consultas y solicitudes
- Validación de actividad asignada del día

#### Información
- Carga de ventas via CSV
- Lógica de reemplazo por período
- Cierre de mes con confirmación
- Configuración de metas por asesor

#### Usuarios (Admin)
- CRUD completo de usuarios
- Filtros por rol, regional, estado
- Sincronización masiva de contraseñas
- Exportación a Excel/CSV

#### Configuración (Admin)
- Gestión de regionales
- Formas de pago y clasificación
- Promedios y porcentajes de metas
- Parámetros de programación
- Matriz de permisos por rol

### 🔧 Correcciones Críticas

- **RLS Recursión Infinita**: Corregida política de `programacion` que causaba recursión. Implementada función SECURITY DEFINER `is_colleague_in_activity()`.
- **Ranking Regional**: Corregido cálculo de posición usando funciones RPC seguras.
- **Ventas Netas**: Implementado uso de SUM en lugar de ABS para contabilizar devoluciones.
- **Normalización de Códigos**: LPAD a 5 dígitos para matching correcto entre ventas y perfiles.

### 🏗️ Arquitectura

- Hooks reutilizables: `useSalesCount`, `useActivityCompliance`, `useSchedulingConfig`
- Componentes modulares por dominio
- Edge Functions para operaciones backend
- RLS policies con funciones SECURITY DEFINER
- Documentación técnica completa

### 📄 Documentación

- `docs/SYSTEM_ARCHITECTURE.md` - Arquitectura del sistema
- `docs/USER_GUIDE.md` - Guía de usuario por rol
- `docs/API_REFERENCE.md` - Referencia de APIs

---

## Próximos Pasos (Post-MVP)

### Prioridad Alta
- [ ] Habilitar Leaked Password Protection
- [ ] Tests automatizados (Vitest)
- [ ] Validación GPS de distancia a punto programado

### Prioridad Media
- [ ] Notificaciones push para evidencia pendiente
- [ ] Exportación de incumplimientos a Excel
- [ ] Dashboard de tendencias mensuales

### Prioridad Baja
- [ ] Modo offline para asesores
- [ ] Integración con intranet corporativa
- [ ] Analytics avanzados con gráficos de tendencias
