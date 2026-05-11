-- ══════════════════════════════════════════════════════════════════════════════
-- FIX: Registros post-almuerzo marcados incorrectamente como "Late"
-- Fecha: 2026-05-08
-- ══════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA:
--   Cuando un empleado registra entrada (7am), salida (12pm), y vuelve del
--   almuerzo (1pm), el sistema creaba un segundo AttendanceRecord y calculaba
--   el retardo comparando la hora de regreso (1pm) contra entryTime (7am),
--   resultando en ~356 minutos de retardo incorrectos.
--
-- CAUSA:
--   calcAttendanceStatus() siempre comparaba contra entryTime sin considerar
--   si el check-in era un retorno de almuerzo (segundo registro del día).
--
-- SOLUCIÓN EN CÓDIGO (ya aplicada):
--   - shared/utils/schedule.ts: calcAttendanceStatus() acepta isPostLunch=true
--     y usa lunchEnd como umbral en vez de entryTime.
--   - svc-mobile/checker.service.ts y svc-attendance/attendance.service.ts:
--     detectan automáticamente si es retorno de almuerzo (ya existe un registro
--     completo y el horario tiene hasLunch=true). Permiten máx 2 registros por
--     día si hasLunch, sin límite si no tiene almuerzo.
--
-- ESTAS QUERIES: corrigen los registros históricos ya guardados en BD con
--   lateMinutes incorrectos, recalculando el valor real contra lunchEnd.
--
-- FÓRMULA USADA (sin manejo de zonas horarias, usando el lateMinutes original):
--   nuevo_late = MAX(0, lateMinutes_original + entryTime_mins - lunchEnd_mins)
--   (la tolerancia se cancela algebraicamente en ambos lados)
--
-- CRITERIO DE SELECCIÓN:
--   - status = 'Late' AND lateMinutes > 60  (retardos > 1h son post-almuerzo)
--   - Existe otro registro del mismo empleado en el mismo día con checkInTime menor
--   - El horario del empleado tiene hasLunch = true y lunchEnd definido
-- ══════════════════════════════════════════════════════════════════════════════


-- ── PASO 1: Diagnóstico ───────────────────────────────────────────────────────
-- Muestra los registros afectados con el valor correcto ANTES de modificar.
-- Cambiar t.name para filtrar por empresa específica, o quitar el filtro para ver todas.

WITH affected AS (
  SELECT
    ar.id,
    ar."lateMinutes"                          AS late_original,
    CONCAT(e."firstName",' ',e."lastName")    AS empleado,
    e."employeeCode"                          AS codigo,
    t.name                                    AS empresa,
    ar.status                                 AS status_actual,
    COALESCE(s."lateToleranceMinutes", 0)     AS tolerancia,
    s.days::jsonb                             AS schedule_days,
    EXTRACT(DOW FROM ar.date::date)::int      AS dow
  FROM "AttendanceRecord" ar
  JOIN "Employee" e ON e.id = ar."employeeId"
  JOIN "Tenant"   t ON t.id = ar."tenantId"
  LEFT JOIN "Schedule" s ON s.id = e."scheduleId"
  WHERE ar."isDeleted" = false
    AND t.name = 'Abisoft SA'          -- ← cambiar o quitar para otras empresas
    AND ar.status = 'Late'
    AND ar."lateMinutes" > 60
    AND (
      SELECT COUNT(*) FROM "AttendanceRecord" ar2
      WHERE ar2."employeeId" = ar."employeeId"
        AND ar2.date = ar.date
        AND ar2."isDeleted" = false
        AND ar2."checkInTime" < ar."checkInTime"
    ) > 0
),
with_schedule AS (
  SELECT
    a.*,
    (SELECT elem->>'entryTime'
     FROM jsonb_array_elements(a.schedule_days) elem
     WHERE (elem->>'day')::int = a.dow LIMIT 1)  AS entry_time,
    (SELECT elem->>'lunchEnd'
     FROM jsonb_array_elements(a.schedule_days) elem
     WHERE (elem->>'day')::int = a.dow
       AND (elem->>'hasLunch')::boolean = true LIMIT 1) AS lunch_end
  FROM affected a
),
calculated AS (
  SELECT
    w.*,
    (SPLIT_PART(w.entry_time, ':', 1)::int * 60
     + SPLIT_PART(w.entry_time, ':', 2)::int)    AS entry_mins,
    (SPLIT_PART(w.lunch_end,  ':', 1)::int * 60
     + SPLIT_PART(w.lunch_end,  ':', 2)::int)    AS lunch_end_mins
  FROM with_schedule w
  WHERE w.entry_time IS NOT NULL AND w.lunch_end IS NOT NULL
)
SELECT
  empleado, codigo, empresa,
  status_actual, late_original,
  entry_time, lunch_end,
  GREATEST(0, late_original + entry_mins - lunch_end_mins) AS nuevos_minutos,
  CASE WHEN late_original + entry_mins - lunch_end_mins > 0
    THEN 'Late' ELSE 'Present'
  END AS nuevo_status
FROM calculated
ORDER BY empresa, empleado;


-- ── PASO 2: Corrección ────────────────────────────────────────────────────────
-- Aplica el recálculo. Ejecutar solo después de verificar el PASO 1.
-- El status se castea a "AttendanceStatus" (enum de PostgreSQL).

WITH affected AS (
  SELECT
    ar.id,
    ar."lateMinutes"                      AS late_original,
    COALESCE(s."lateToleranceMinutes", 0) AS tolerancia,
    s.days::jsonb                         AS schedule_days,
    EXTRACT(DOW FROM ar.date::date)::int  AS dow
  FROM "AttendanceRecord" ar
  JOIN "Employee" e ON e.id = ar."employeeId"
  JOIN "Tenant"   t ON t.id = ar."tenantId"
  LEFT JOIN "Schedule" s ON s.id = e."scheduleId"
  WHERE ar."isDeleted" = false
    AND t.name = 'Abisoft SA'          -- ← cambiar o quitar para otras empresas
    AND ar.status = 'Late'
    AND ar."lateMinutes" > 60
    AND (
      SELECT COUNT(*) FROM "AttendanceRecord" ar2
      WHERE ar2."employeeId" = ar."employeeId"
        AND ar2.date = ar.date
        AND ar2."isDeleted" = false
        AND ar2."checkInTime" < ar."checkInTime"
    ) > 0
),
with_schedule AS (
  SELECT
    a.id, a.late_original,
    (SELECT elem->>'entryTime'
     FROM jsonb_array_elements(a.schedule_days) elem
     WHERE (elem->>'day')::int = a.dow LIMIT 1)  AS entry_time,
    (SELECT elem->>'lunchEnd'
     FROM jsonb_array_elements(a.schedule_days) elem
     WHERE (elem->>'day')::int = a.dow
       AND (elem->>'hasLunch')::boolean = true LIMIT 1) AS lunch_end
  FROM affected a
),
calculated AS (
  SELECT
    w.id,
    GREATEST(0, w.late_original
      + (SPLIT_PART(w.entry_time,':',1)::int*60 + SPLIT_PART(w.entry_time,':',2)::int)
      - (SPLIT_PART(w.lunch_end, ':',1)::int*60 + SPLIT_PART(w.lunch_end, ':',2)::int)
    ) AS nuevos_minutos,
    CASE
      WHEN w.late_original
        + (SPLIT_PART(w.entry_time,':',1)::int*60 + SPLIT_PART(w.entry_time,':',2)::int)
        - (SPLIT_PART(w.lunch_end, ':',1)::int*60 + SPLIT_PART(w.lunch_end, ':',2)::int) > 0
      THEN 'Late'::"AttendanceStatus"
      ELSE 'Present'::"AttendanceStatus"
    END AS nuevo_status
  FROM with_schedule w
  WHERE w.entry_time IS NOT NULL AND w.lunch_end IS NOT NULL
)
UPDATE "AttendanceRecord"
SET
  status        = c.nuevo_status,
  "lateMinutes" = c.nuevos_minutos,
  "updatedAt"   = NOW()
FROM calculated c
WHERE "AttendanceRecord".id = c.id;


-- ── PASO 3: Verificación ──────────────────────────────────────────────────────
-- Debe devolver 0 filas si todo quedó correcto.

SELECT COUNT(*) AS pendientes
FROM "AttendanceRecord" ar
JOIN "Tenant" t ON t.id = ar."tenantId"
WHERE ar."isDeleted" = false
  AND t.name = 'Abisoft SA'          -- ← cambiar o quitar para otras empresas
  AND ar.status = 'Late'
  AND ar."lateMinutes" > 60
  AND (
    SELECT COUNT(*) FROM "AttendanceRecord" ar2
    WHERE ar2."employeeId" = ar."employeeId"
      AND ar2.date = ar.date
      AND ar2."isDeleted" = false
      AND ar2."checkInTime" < ar."checkInTime"
  ) > 0;
