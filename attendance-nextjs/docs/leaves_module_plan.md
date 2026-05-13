# Planificación — Módulo Permisos y Vacaciones

**Fecha:** 2026-05-13  
**Estado:** Pendiente de implementación

---

## Tipos de permiso

| Tipo | Descripción |
|---|---|
| `Vacation` | Vacaciones |
| `AbsencePerm` | Permiso para faltar |
| `LatePerm` | Permiso para llegar tarde |
| `EarlyPerm` | Permiso para salir temprano |
| `SickLeave` | Incapacidad |

**Regla general:** Solo el admin crea y gestiona permisos. El empleado solo recibe notificaciones y ve el banner en la app.

---

## Comportamiento por tipo

### Vacaciones
- Status del día → `Excused` (etiqueta "Vacación")
- Si el empleado registra asistencia de todos modos → horas guardadas como "horas trabajadas en vacación" → se tratan como **extraordinarias** en el reporte de horas extra
- Checker web: badge azul "Vacaciones", no genera alerta de "sin registro"
- Push día anterior (cron 8:00 AM): "Mañana inician tus vacaciones (DD/MM – DD/MM)"

### Permiso para faltar
- Status del día → `Excused` (etiqueta "Permiso")
- Si el empleado viene de todos modos → registro normal (`Present`), permiso queda como no usado
- Checker web: badge naranja "Permiso falta"
- Push día anterior: "Tienes un permiso de falta aprobado para mañana"

### Incapacidad
- Status del día → `Excused` (etiqueta "Incapacidad")
- Si registra asistencia → horas tratadas como **extraordinarias** en reporte
- Checker web: badge rojo "Incapacidad"
- Push día anterior: "Incapacidad registrada para mañana"

### Permiso para llegar tarde
- Admin define `permittedTime` (HH:MM — hora límite de entrada)
- Si `checkIn <= permittedTime` → `Present`, `lateMinutes = 0`
- Si `checkIn > permittedTime` → `Late` (cálculo normal, permiso expiró)
- Si no hay `checkIn` al cierre del día → `Absent` (no `Excused`)
- Checker web: badge amarillo "Llega hasta HH:MM"
- **Notificación:** cron cada minuto, dispara a `permittedTime - 5 min`
  - Si el empleado YA tiene checkIn → NO enviar
  - Si NO tiene checkIn → push: "Tu permiso de llegada tardía vence en 5 min (HH:MM). Registra tu entrada."
  - El recordatorio estándar de entrada queda suprimido para este empleado ese día

### Permiso para salir temprano
- Admin define `permittedTime` (HH:MM — hora desde la que puede salir)
- Si `checkOut >= permittedTime` → `Present`, sin penalización
- Si sale después de `permittedTime` → válido, se registra hora real
- Si no hay `checkOut` → auto-completar `permittedTime` para cálculo de horas
- Checker web: badge verde "Sale desde HH:MM"
- **Notificación:** cron cada minuto, dispara a `permittedTime - 5 min`
  - Si el empleado YA tiene checkOut → NO enviar
  - Si NO tiene checkOut → push: "Tu permiso de salida temprana vence en 5 min (HH:MM). Registra tu salida."

---

## Fase 1 — Base de datos

```prisma
enum LeaveType {
  Vacation
  AbsencePerm
  LatePerm
  EarlyPerm
  SickLeave
}

enum LeaveStatus {
  Approved
  Cancelled
}

model LeaveRequest {
  id            String      @id @default(uuid())
  tenantId      String
  employeeId    String
  type          LeaveType
  status        LeaveStatus @default(Approved)
  startDate     String      // YYYY-MM-DD
  endDate       String      // YYYY-MM-DD
  permittedTime String?     // HH:MM — solo LatePerm y EarlyPerm
  reason        String?
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime?   @updatedAt
  isDeleted     Boolean     @default(false)

  tenant        Tenant      @relation(fields: [tenantId], references: [id])
  employee      Employee    @relation(fields: [employeeId], references: [id])

  @@index([tenantId, startDate, endDate])
  @@index([employeeId, startDate])
}
```

Agregar `leaveRequests LeaveRequest[]` en los modelos `Tenant` y `Employee`.

---

## Fase 2 — Backend: svc-attendance módulo leaves

### Estructura de archivos
```
svc-attendance/src/
  app/api/v1/
    leaves/route.ts              GET + POST
    leaves/[id]/route.ts         GET + PUT
    leaves/[id]/cancel/route.ts  PUT
  modules/leaves/
    leaves.service.ts
```

### Endpoints admin

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/leaves` | Listar — filtros: `employeeId`, `type`, `from`, `to`, `page`, `pageSize` |
| `POST` | `/api/v1/leaves` | Crear permiso (status `Approved` por defecto) |
| `GET` | `/api/v1/leaves/{id}` | Detalle |
| `PUT` | `/api/v1/leaves/{id}` | Editar |
| `PUT` | `/api/v1/leaves/{id}/cancel` | Cancelar |

### Endpoint mobile

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/mobile/leaves/today` | Permiso activo del empleado autenticado para hoy |

---

## Fase 3 — Integración en cálculo de asistencia

**Archivo:** `svc-attendance/src/modules/attendance/attendance.service.ts`

Antes de determinar el status del día, consultar `getActiveLeaveForDate(employeeId, date)`:

```
Vacation / AbsencePerm / SickLeave:
  → status = Excused
  → si hay checkIn/Out: hoursWorked se guarda (informativo)

LatePerm:
  → si checkIn <= permittedTime  → Present, lateMinutes = 0
  → si checkIn > permittedTime   → Late (cálculo normal)
  → si no hay checkIn al cierre  → Absent

EarlyPerm:
  → si checkOut >= permittedTime → Present, sin penalización
  → si no hay checkOut           → auto-completar permittedTime para horas trabajadas

Sin permiso: lógica actual sin cambios
```

---

## Fase 4 — Cron job de notificaciones push

**Archivo:** `svc-attendance/src/modules/leaves/leaves.notifications.ts`

### Cron cada minuto — LatePerm y EarlyPerm

```
Para cada LeaveRequest Approved de hoy:

  CASE LatePerm:
    horaTrigger = permittedTime - 5 minutos
    Si hora_actual == horaTrigger:
      ¿checkIn ya existe? → SÍ: skip | NO: push
      "Tu permiso de llegada tardía vence en 5 min (HH:MM). Registra tu entrada."

  CASE EarlyPerm:
    horaTrigger = permittedTime - 5 minutos
    Si hora_actual == horaTrigger:
      ¿checkOut ya existe? → SÍ: skip | NO: push
      "Tu permiso de salida temprana vence en 5 min (HH:MM). Registra tu salida."
```

El recordatorio estándar de entrada/salida queda suprimido para empleados con LatePerm/EarlyPerm activo ese día.

### Cron diario 8:00 AM — Vacation / AbsencePerm / SickLeave

Para permisos cuyo `startDate` = mañana:
```
→ push informativo con descripción del permiso
```

---

## Fase 5 — Adaptación de reportes existentes

**Archivo:** `svc-analytics/src/modules/reports/reports.service.ts`

### 5.1 — Cargar permisos del período

En `getReport` y `getEmployeeDetail`, antes de procesar días:

```typescript
const leaveRequests = await prisma.leaveRequest.findMany({
  where: {
    tenantId,
    startDate: { lte: to },
    endDate:   { gte: from },
    isDeleted: false,
    status:    'Approved',
  },
})
// Indexar por `${employeeId}:${date}` para lookup O(1)
const leaveByEmpDate = buildLeaveIndex(leaveRequests)
```

### 5.2 — Nuevo campo `leaveType` en DayRow

```typescript
interface DayRow {
  // ... campos existentes ...
  leaveType?:          string | null  // tipo de permiso activo ese día
  leavePermittedTime?: string | null  // HH:MM para LatePerm/EarlyPerm
}
```

### 5.3 — Reporte `absences`

- Los días `Excused` por permiso **no** aparecen como faltas
- Solo `statusKey === 'Absent'` (sin permiso) aparece en este reporte

### 5.4 — Reporte `lates`

- Excluir días donde `leaveType === 'LatePerm'` y el empleado llegó dentro del tiempo permitido

```typescript
allRows = allRows.filter(r => r.statusKey === 'Late' && !r.leaveType)
```

### 5.5 — Reporte `early-departures`

- Excluir días donde `leaveType === 'EarlyPerm'`

```typescript
allRows = allRows.filter(r => (r.earlyLeaveMinutes ?? 0) > 0 && r.leaveType !== 'EarlyPerm')
```

### 5.6 — Reporte `overtime`: correcciones ley ecuatoriana

**A) Trabajar durante Vacation / SickLeave / AbsencePerm = Extraordinaria**

Si el empleado tiene permiso de ausencia total y registró asistencia, esas horas son extraordinarias (equivalente a día de descanso):

```typescript
if (['Vacation', 'SickLeave', 'AbsencePerm'].includes(leaveType)) {
  overrideAsHoliday = true  // calcOvertimeSegments recibe isHoliday = true
}
```

**B) Caps ley ecuatoriana (Código del Trabajo, Art. 49)**

Actualmente implementado:
- ✅ Recargo nocturno 25% (19:00–06:00)
- ✅ Suplementaria diurna 50% (horas extra antes de medianoche)
- ✅ Suplementaria nocturna 100% (horas extra después de medianoche)
- ✅ Extraordinaria 100% (feriado / día de descanso)

Por agregar — límites legales informativos:
- ❌ Máximo 4 horas suplementarias/día → flag `exceeds_daily_limit`
- ❌ Máximo 12 horas suplementarias/semana → flag `exceeds_weekly_limit`
- ❌ Extraordinaria en días de permiso de ausencia total

```typescript
// Campos nuevos en el response de overtime
overtimeLimitWarnings: [
  { date: 'YYYY-MM-DD', type: 'daily',  minutes: X, limitMinutes: 240 },
  { week: 'YYYY-WNN',   type: 'weekly', minutes: X, limitMinutes: 720 },
]
```

---

## Fase 6 — Checker Web: badges en vista día

**Archivo:** `attendance-frontend/src/features/attendance/AttendancePage.tsx`

El endpoint `day-view` incluye `activeLeave: { type, permittedTime }` en cada row.

| Tipo | Badge | Color |
|---|---|---|
| `Vacation` | "Vacaciones" | Azul |
| `AbsencePerm` | "Permiso falta" | Naranja |
| `SickLeave` | "Incapacidad" | Rojo |
| `LatePerm` | "Llega hasta HH:MM" | Amarillo |
| `EarlyPerm` | "Sale desde HH:MM" | Verde |

Vacation / AbsencePerm / SickLeave → no generan alerta de "sin registro".

---

## Fase 7 — Frontend Admin: LeavesPage

**Archivo nuevo:** `attendance-frontend/src/features/leaves/LeavesPage.tsx`

```
LeavesPage
  ├── Header + botón "Nuevo permiso"
  ├── Filtros: empleado, tipo, estado, fechas desde/hasta
  ├── Tabla (desktop) / Cards (mobile)
  │     Empleado | Tipo | Fechas | Hora permitida | Motivo | Estado | Acciones
  └── LeaveFormModal (crear / editar)
        Campos:
          - Empleado (selector con búsqueda)
          - Tipo de permiso (5 opciones con ícono y descripción)
          - Fecha inicio / Fecha fin
          - Hora permitida HH:MM (solo visible si LatePerm o EarlyPerm)
          - Motivo (textarea, opcional)
          - Notas internas (textarea, opcional)
```

**Sidebar:** entrada "Permisos" entre "Asistencia" y "Reportes".

---

## Fase 8 — App Mobile: banner en home

**Archivo:** `attendance-mobile/app/(app)/index.tsx`

Llama a `GET /api/v1/mobile/leaves/today` al cargar la pantalla.

Si hay permiso activo, mostrar banner sobre el contenido principal:

| Tipo | Banner |
|---|---|
| `Vacation` | 🔵 "De vacaciones hasta DD/MM" |
| `AbsencePerm` | 🟠 "Tienes permiso de falta hoy" |
| `SickLeave` | 🔴 "Incapacidad registrada" |
| `LatePerm` | 🟡 "Puedes ingresar hasta las HH:MM" |
| `EarlyPerm` | 🟢 "Puedes salir desde las HH:MM" |

---

## Orden de implementación

| # | Tarea | Archivo(s) |
|---|---|---|
| 1 | Schema Prisma + migración | `packages/shared/prisma/schema.prisma` |
| 2 | `leaves.service.ts` + routes | `svc-attendance/src/modules/leaves/` |
| 3 | Endpoint `mobile/leaves/today` | `svc-mobile/src/app/api/v1/mobile/leaves/` |
| 4 | Integración en cálculo de asistencia | `svc-attendance/src/modules/attendance/attendance.service.ts` |
| 5 | Cron de notificaciones push | `svc-attendance/src/modules/leaves/leaves.notifications.ts` |
| 6 | Adaptación reportes: ausencias, tardanzas, salidas tempranas | `svc-analytics/src/modules/reports/reports.service.ts` |
| 7 | Reporte overtime: extraordinaria en permisos + caps EC | `svc-analytics` + `packages/shared/src/utils/overtime.ts` |
| 8 | `day-view` incluye `activeLeave` | `svc-attendance/src/app/api/v1/attendance/day-view/` |
| 9 | `LeavesPage` + `LeaveFormModal` | `attendance-frontend/src/features/leaves/` |
| 10 | Badges en `AttendancePage` vista día | `attendance-frontend/src/features/attendance/AttendancePage.tsx` |
| 11 | Banner en home app mobile | `attendance-mobile/app/(app)/index.tsx` |
