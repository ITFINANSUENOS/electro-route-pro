# Guía de Usuario - Sistema E-COM

## 📱 Acceso al Sistema

### Iniciar Sesión

1. Abra la URL del sistema
2. Ingrese su **Cédula** o **Correo electrónico**
3. Ingrese su **Contraseña**
4. Haga clic en **Iniciar Sesión**

---

## 👤 Funcionalidades por Rol

### 🔵 Asesor Comercial

#### Dashboard Personal
- **Ventas del Mes**: Total de ventas netas en el período
- **Posición Regional**: Su ranking entre asesores de la regional
- **Posición en Grupo**: Su ranking dentro del equipo del Jefe de Ventas
- **Meta**: Objetivo mensual y porcentaje de cumplimiento

#### Programación (Solo Lectura)
- Ver sus actividades programadas en calendario
- Ver compañeros asignados a la misma actividad
- Identificar ubicación y horarios

#### Actividades - Registro de Evidencia
**Ventana de reporte: 4:00 PM - 9:00 PM**

1. **Para Correría**:
   - Subir foto de evidencia
   - Registrar ubicación GPS (automático)
   - Ingresar consultas realizadas
   - Ingresar solicitudes generadas

2. **Para Punto Fijo**:
   - Registrar ubicación GPS
   - Ingresar consultas y solicitudes

3. **Sin Actividad Asignada**:
   - Solo registrar consultas/solicitudes en horario permitido

---

### 🟢 Jefe de Ventas

#### Dashboard de Equipo
- KPIs agregados del equipo
- Ranking de asesores a su cargo
- Gráfico de rendimiento comparativo
- Indicadores de incumplimiento

#### Programación (Solo Lectura)
- Ver todas las actividades de su equipo
- Filtrar por asesor o tipo de actividad

#### Mapa
- Ver ubicaciones de evidencia GPS de su equipo
- Validar presencia en puntos programados

---

### 🟡 Líder de Zona

#### Dashboard Regional
- KPIs de toda la regional
- Filtros por tipo de asesor
- Ranking completo de asesores
- Métricas de cumplimiento

#### Programación (Lectura/Escritura)
- **Crear actividades**: 
  1. Seleccionar fecha (respetar días de bloqueo)
  2. Elegir tipo: Punto Fijo, Correría, Libre
  3. Buscar ubicación en Google Maps
  4. Seleccionar asesores asignados
  5. Definir horario (opcional)
  
- **Editar/Eliminar**: Solo dentro del período permitido

#### Información
- **Cargar Ventas**: Subir CSV con datos de ventas
- **Metas**: Configurar metas por asesor

---

### 🟠 Coordinador Comercial

Acceso similar al Líder de Zona con visibilidad de múltiples regionales.

---

### 🔴 Administrador

#### Todas las funcionalidades anteriores +

#### Usuarios
- Ver listado completo de usuarios
- Filtrar por rol, regional, estado
- Editar información de usuarios
- Activar/Desactivar usuarios
- Sincronizar contraseñas masivamente

#### Asesores Pendientes de Creación
- **Detección automática**: Al cargar ventas del **mes vigente**, el sistema detecta asesores con >3 ventas que no tienen perfil en el sistema
- **Solo mes en curso**: Los asesores de meses anteriores no se detectan como pendientes (pueden haber sido vendedores temporales)
- **Normalización de códigos**: Se comparan códigos sin ceros a la izquierda (ej: `2923` = `02923`) y también por cédula
- **Auto-resolución**: Los falsos positivos se resuelven automáticamente al detectar que ya existe un perfil coincidente
- **Wizard de creación**: Permite crear usuarios uno a uno con datos pre-llenados desde las ventas

#### Configuración
- **Regionales**: Gestionar sedes
- **Formas de Pago**: Clasificación de ventas
- **Metas**: Promedios y porcentajes por regional
- **Programación**: Días de bloqueo, requisitos de evidencia
- **Permisos**: Matriz de permisos por rol

---

## 📊 Interpretación de Indicadores

### Estados de Cumplimiento

| Color | Significado |
|-------|-------------|
| 🟢 Verde | Cumplimiento ≥ 80% |
| 🟡 Amarillo | Cumplimiento 50-79% |
| 🔴 Rojo | Cumplimiento < 50% |

### Tipos de Incumplimiento

- **Sin Evidencia**: No se subió reporte del día
- **Sin Foto**: Correría sin foto
- **Sin GPS**: Falta validación de ubicación
- **Sin Consultas**: No se registraron consultas/solicitudes

---

## 📋 Flujos de Trabajo

### Ciclo Diario del Asesor

```
MAÑANA
├─ Revisar programación del día
└─ Dirigirse a punto/correría asignada

TARDE (4pm-9pm)
├─ Abrir módulo "Actividades"
├─ Tomar foto (si es correría)
├─ Permitir ubicación GPS
├─ Registrar consultas realizadas
├─ Registrar solicitudes generadas
└─ Guardar evidencia
```

### Ciclo Mensual del Líder

```
INICIO DE MES
├─ Cerrar período anterior (si aplica)
└─ Programar actividades del mes

DURANTE EL MES
├─ Monitorear dashboard de cumplimiento
├─ Revisar indicadores de incumplimiento
├─ Cargar archivos de ventas actualizados
└─ Ajustar programación según necesidad

FIN DE MES
├─ Verificar cumplimiento de metas
├─ Revisar ranking final
└─ Exportar reportes a Excel
```

---

## ❓ Preguntas Frecuentes

### ¿Por qué no puedo ver mis ventas?
Verifique que su código de asesor esté correctamente registrado en su perfil.

### ¿Por qué no puedo subir evidencia?
- Verifique que esté dentro del horario permitido (4pm-9pm)
- Asegúrese de tener una actividad asignada para hoy
- Verifique permisos de cámara y ubicación en su navegador

### ¿Por qué no puedo crear una actividad?
- Solo Líderes, Coordinadores y Administradores pueden crear actividades
- Verifique que la fecha esté dentro del período permitido (días de bloqueo)

### ¿Cómo exporto el ranking a Excel?
En el Dashboard, haga clic en el botón de Excel junto a la tabla de ranking.

---

## 🆘 Soporte

Para problemas técnicos, contacte al administrador del sistema con:
1. Descripción del problema
2. Captura de pantalla (si aplica)
3. Rol y regional del usuario
