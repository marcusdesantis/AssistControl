# Lógica del Checador — Cómo funciona el registro de asistencia

## Resumen

El checador registra entradas y salidas de empleados. Soporta múltiples registros por día
(imprevistos, descanso de almuerzo, horas extras) con las siguientes reglas:

- **Tardanza**: solo se evalúa en la **primera entrada de cada período** (mañana y tarde).
- **Imprevistos**: cualquier entrada adicional dentro del mismo período siempre es `Present`.
- **Horas extras**: entradas después de la hora de salida (`exitTime`) siempre son `Present`.

---

## Períodos de trabajo

Un horario define uno o dos períodos según si tiene almuerzo configurado:

```
Sin almuerzo:
  └─ Período único: entryTime → exitTime

Con almuerzo (hasLunch = true):
  ├─ Período mañana: entryTime → lunchStart
  └─ Período tarde:  lunchEnd  → exitTime
```

---

## Reglas de tardanza por tipo de entrada

| Tipo de entrada | Cómo se detecta | Compara contra | Resultado si llega tarde |
|---|---|---|---|
| 1ª entrada del día (mañana) | 1° check-in del período mañana | `entryTime` + tolerancia | `Late X min` |
| Regreso de almuerzo | 1° check-in del período tarde | `lunchEnd` + tolerancia | `Late X min` |
| Imprevisto (mañana) | 2°+ check-in del período mañana | — (no evalúa) | `Present` |
| Imprevisto (tarde) | 2°+ check-in del período tarde | — (no evalúa) | `Present` |
| Horas extras | check-in después de `exitTime` | — (no evalúa) | `Present` |

---

## Ejemplos con horario 7am–4pm, almuerzo 12pm–1pm

### Ejemplo A — Día normal sin novedades
```
07:00  Entrada   → 1° mañana, compara vs 7:00 → Present ✓
12:00  Salida
13:00  Entrada   → 1° tarde, compara vs 13:00 → Present ✓
16:00  Salida
```
**Resultado:** 0 tardanzas. Tiempo trabajado: 8h.

---

### Ejemplo B — Llegó tarde
```
08:30  Entrada   → 1° mañana, compara vs 7:00 → Late 90 min ⚠️
12:00  Salida
13:00  Entrada   → 1° tarde, compara vs 13:00 → Present ✓
16:00  Salida
```
**Resultado:** 1 tardanza (90 min). Tiempo trabajado: 7h 30min.

---

### Ejemplo C — Tardó del almuerzo
```
07:00  Entrada   → 1° mañana → Present ✓
12:00  Salida
13:20  Entrada   → 1° tarde, compara vs 13:00 → Late 20 min ⚠️
16:00  Salida
```
**Resultado:** 1 tardanza (20 min). Tiempo trabajado: 7h 40min.

---

### Ejemplo D — Imprevisto en la mañana
```
07:00  Entrada   → 1° mañana → Present ✓
10:00  Salida    (imprevisto)
11:00  Entrada   → 2° mañana → Present ✓ (no evalúa tardanza)
12:00  Salida
13:00  Entrada   → 1° tarde  → Present ✓
16:00  Salida
```
**Resultado:** 0 tardanzas. Tiempo trabajado: 6h (se descuenta la hora del imprevisto).

---

### Ejemplo E — Múltiples imprevistos todo el día
```
07:00  Entrada   → 1° mañana → Present ✓
08:00  Salida
09:00  Entrada   → 2° mañana → Present ✓
10:00  Salida
11:00  Entrada   → 3° mañana → Present ✓
12:00  Salida
12:55  Entrada   → 1° tarde, compara vs 13:00 → Present ✓ (llegó antes)
14:00  Salida
15:00  Entrada   → 2° tarde  → Present ✓
16:00  Salida
```
**Resultado:** 0 tardanzas. Tiempo trabajado: 5h 5min (suma real de cada par entrada/salida).

---

### Ejemplo F — Llegó tarde + imprevisto + tardó almuerzo
```
08:00  Entrada   → 1° mañana, compara vs 7:00 → Late 60 min ⚠️
10:00  Salida
10:30  Entrada   → 2° mañana → Present ✓
12:00  Salida
13:25  Entrada   → 1° tarde, compara vs 13:00 → Late 25 min ⚠️
16:00  Salida
```
**Resultado:** 2 tardanzas (60 min + 25 min). Tiempo trabajado: 5h 55min.

---

### Ejemplo G — Horas extras después del horario
```
07:00  Entrada   → Present ✓
12:00  Salida
13:00  Entrada   → Present ✓
16:00  Salida
17:00  Entrada   → después de exitTime (16:00) → Present ✓ (horas extras)
19:00  Salida
```
**Resultado:** 0 tardanzas. Las horas extras (17:00–19:00) se calculan automáticamente
en el reporte de horas extras (Art. 55 Ecuador).

---

## Lo que muestra el checador web tras cada registro

### Al registrar entrada (overlay de confirmación)
```
✓  Juan Pérez
   Entrada registrada a las 07:00 am
   [ Presente ]   ← verde si llegó a tiempo
   [ Tarde ]      ← amarillo si llegó tarde
```

### Tabla de registros del día
| # | Empleado | Tipo | Hora | Retardo |
|---|---|---|---|---|
| 1 | Juan Pérez | Entrada | 07:00am | — |
| 2 | Juan Pérez | Salida | 10:00am | — |
| 3 | Juan Pérez | Entrada | 11:00am | — | ← imprevisto, sin retardo
| 4 | Juan Pérez | Salida | 12:00pm | — |
| 5 | Juan Pérez | Entrada | 01:20pm | 20 min | ← tardó del almuerzo
| 6 | Juan Pérez | Salida | 04:00pm | — |

### Contadores en tiempo real
```
Presentes: N   Retardos: N   Salidas: N
```
- **Presentes**: registros con `status = Present`
- **Retardos**: registros con `status = Late`
- **Salidas**: registros que tienen checkOut registrado

### Barra del último registro (pie del panel izquierdo)
```
Juan Pérez  entrada  a las 07:00 am
Retardos totales: 1  |  Registros pendientes: 0  |  Faltas: 0
```

---

## Lo que muestra la app móvil (attendance-mobile)

El historial de asistencia muestra cada `AttendanceRecord`:
- Hora de entrada y salida
- Si tiene `lateMinutes > 0` → muestra "X min de retraso" en naranja
- Los registros de imprevistos muestran `lateMinutes = 0` → no aparece indicador

---

## Tiempo trabajado — cómo se calcula

Se suma la duración real de **cada par entrada/salida** por separado.
Los gaps (almuerzo, imprevistos) quedan excluidos automáticamente.

```
Registro 1:  7:00 → 10:00  = 180 min
Registro 2: 11:00 → 12:00  =  60 min
Registro 3: 12:55 → 14:00  =  65 min
Registro 4: 15:00 → 16:00  =  60 min
─────────────────────────────────────
Total real = 365 min = 6h 5min
Programado = 480 min = 8h
Balance    = -115 min = -1h 55min
```

---

## Horas extras

Las horas trabajadas fuera del horario programado se calculan en el
**Reporte de Horas Extras** del admin. Ecuador aplica el Art. 55:
- **Suplementarias 50%**: horas extra diurnas en días laborables
- **Nocturnas 25%**: trabajo entre 7pm y 6am
- **Suplementarias nocturnas 100%**: horas nocturnas extra
- **Extraordinarias 100%**: trabajo en días de descanso o feriados

El checador solo muestra `Present` para las entradas de overtime.
El cálculo de cuántas horas extra y de qué tipo se hace en el reporte.

---

## Archivos clave del código

| Archivo | Qué hace |
|---|---|
| `packages/shared/src/utils/schedule.ts` | `calcAttendanceStatus()` — calcula si es tarde y cuántos minutos |
| `services/svc-mobile/src/modules/checker/checker.service.ts` | `checkIn()` del checador web/físico |
| `services/svc-attendance/src/modules/attendance/attendance.service.ts` | `checkIn()` desde el admin web |
| `services/svc-analytics/src/modules/reports/reports.service.ts` | Reportes — suma duración real de registros |
| `docs/fix_postlunch_checkin.sql` | Queries SQL para corregir registros históricos incorrectos |
