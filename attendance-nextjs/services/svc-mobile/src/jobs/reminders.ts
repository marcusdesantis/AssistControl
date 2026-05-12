import { prisma, getScheduleDay, sendExpoPush } from '@attendance/shared'
import { DateTime } from 'luxon'

function minsFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

async function runReminders() {
  try {
    // Solo tenants con plan que incluya mobileApp
    const subscriptions = await prisma.subscription.findMany({
      where:   { status: { in: ['active', 'trialing'] } },
      include: { plan: { select: { capabilities: true } }, tenant: { select: { id: true, timeZone: true, isDeleted: true } } },
    })

    const eligibleTenantIds: string[] = []
    for (const sub of subscriptions) {
      if (!sub.tenant || sub.tenant.isDeleted) continue
      const caps = sub.plan?.capabilities as Record<string, { enabled?: boolean }> | null
      if (caps?.mobileApp?.enabled !== true) continue
      eligibleTenantIds.push(sub.tenant.id)
    }

    console.log(`[reminders] ${new Date().toISOString()} subs=${subscriptions.length} eligible=${eligibleTenantIds.length}`)
    if (eligibleTenantIds.length === 0) return

    const tenants = await prisma.tenant.findMany({
      where: { id: { in: eligibleTenantIds }, isDeleted: false },
      select: { id: true, timeZone: true },
    })

    for (const tenant of tenants) {
      const tz      = tenant.timeZone ?? 'America/Guayaquil'
      const nowDt   = DateTime.now().setZone(tz)
      const today   = nowDt.toFormat('yyyy-MM-dd')
      const nowMins = nowDt.hour * 60 + nowDt.minute

      // Verificar si hoy es feriado para este tenant
      const holiday = await prisma.holiday.findFirst({
        where: { tenantId: tenant.id, date: today, isDeleted: false },
      })

      const employees = await prisma.employee.findMany({
        where:   { tenantId: tenant.id, isDeleted: false, status: 'Active', expoPushToken: { not: null } },
        include: { schedule: true },
      })

      console.log(`[reminders] tenant=${tenant.id} tz=${tz} nowMins=${nowMins} employees=${employees.length}`)
      for (const emp of employees) {
        if (!emp.schedule || !emp.expoPushToken) continue
        if (emp.schedule.type === 'Variable') continue

        // Si el empleado trabaja en feriados o es feriado
        if (holiday && !emp.worksOnHolidays) continue

        const schedDay = getScheduleDay(emp.schedule, nowDt, emp.scheduleStartDate ?? null)
        const entryTarget = schedDay?.entryTime ? minsFromHHMM(schedDay.entryTime) - 5 : null
        const exitTarget  = schedDay?.exitTime  ? minsFromHHMM(schedDay.exitTime)  - 5 : null
        console.log(`[reminders] emp=${emp.id} schedType=${emp.schedule.type} weekday=${nowDt.weekday%7} schedDay=${schedDay ? `isWork=${schedDay.isWorkDay} entry=${schedDay.entryTime} exit=${schedDay.exitTime}` : 'null'} entryTarget=${entryTarget} exitTarget=${exitTarget} nowMins=${nowMins}`)
        if (!schedDay || !schedDay.isWorkDay) continue

        // Registros de hoy del empleado
        const todayRecords = await prisma.attendanceRecord.findMany({
          where:   { tenantId: tenant.id, employeeId: emp.id, date: today, isDeleted: false },
          orderBy: { checkInTime: 'asc' },
        })

        const lunchStartMins = schedDay.hasLunch && schedDay.lunchStart
          ? minsFromHHMM(schedDay.lunchStart) : null
        const lunchEndMins = schedDay.hasLunch && schedDay.lunchEnd
          ? minsFromHHMM(schedDay.lunchEnd) : null

        // ── 1. Recordatorio de ENTRADA (5 min antes de entryTime) ────────────
        if (schedDay.entryTime) {
          const target = minsFromHHMM(schedDay.entryTime) - 5
          if (nowMins === target) {
            const alreadyIn = todayRecords.some(r => r.checkInTime !== null)
            if (!alreadyIn) {
              sendExpoPush(emp.expoPushToken, {
                title: '⏰ Entrada en 5 minutos',
                body:  'Recuerda registrar tu entrada al llegar.',
                data:  { screen: 'home' },
              })
            }
          }
        }

        // ── 2. Recordatorio SALIDA A ALMUERZO (5 min antes de lunchStart) ───
        if (lunchStartMins !== null) {
          const target = lunchStartMins - 5
          if (nowMins === target) {
            // Solo si el empleado tiene check-in activo esta mañana (sin check-out aún)
            const hasActiveMorning = todayRecords.some(r => r.checkInTime && !r.checkOutTime)
            if (hasActiveMorning) {
              sendExpoPush(emp.expoPushToken, {
                title: '🍽 Almuerzo en 5 minutos',
                body:  'Recuerda registrar tu salida antes de ir a almorzar.',
                data:  { screen: 'home' },
              })
            }
          }
        }

        // ── 3. Recordatorio REGRESO DE ALMUERZO (5 min antes de lunchEnd) ───
        if (lunchEndMins !== null && lunchStartMins !== null) {
          const target = lunchEndMins - 5
          if (nowMins === target) {
            // Omitir si ya tiene check-in en período tarde
            const afternoonCheckIn = todayRecords.some(r => {
              if (!r.checkInTime) return false
              const inMins = DateTime.fromJSDate(r.checkInTime, { zone: tz }).hour * 60
                           + DateTime.fromJSDate(r.checkInTime, { zone: tz }).minute
              return inMins >= lunchStartMins
            })
            if (!afternoonCheckIn) {
              sendExpoPush(emp.expoPushToken, {
                title: '🔔 Regreso en 5 minutos',
                body:  'Prepárate para registrar tu entrada al regresar del almuerzo.',
                data:  { screen: 'home' },
              })
            }
          }
        }

        // ── 4. Recordatorio SALIDA DEL DÍA (5 min antes de exitTime) ────────
        if (schedDay.exitTime) {
          const target = minsFromHHMM(schedDay.exitTime) - 5
          if (nowMins === target) {
            // Omitir si no tiene check-in activo (ya salió o nunca entró)
            const hasActive = todayRecords.some(r => r.checkInTime && !r.checkOutTime)
            if (hasActive) {
              sendExpoPush(emp.expoPushToken, {
                title: '🏁 Salida en 5 minutos',
                body:  'Recuerda registrar tu salida al terminar tu jornada.',
                data:  { screen: 'home' },
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[reminders-cron] Error:', err)
  }
}

export function startRemindersCron() {
  // Alinear al próximo minuto exacto, luego correr cada 60 segundos
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds()
  setTimeout(() => {
    runReminders()
    setInterval(runReminders, 60_000)
  }, msToNextMinute)
  console.log('[reminders-cron] Iniciado')
}
