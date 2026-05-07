/**
 * Verifica los cálculos de overtime contra los datos de prueba
 * sin pasar por la UI — ejecuta la misma lógica del backend
 */
import { PrismaClient } from '@prisma/client'
import { getScheduleDay, getScheduledMinutes, calcOvertimeSegments, getOvertimeRules } from '../src/index'
import { DateTime } from 'luxon'

const prisma = new PrismaClient()

const TENANT_ID = 'a8d467f6-9271-4bb2-9548-dae7f65e890d'
const TZ = 'America/Guayaquil'

function fmtMins(m: number | null) {
  if (m == null || m === 0) return '—'
  const h = Math.floor(m / 60), min = m % 60
  return h ? `${h}h${min ? ` ${min}m` : ''}` : `${min}m`
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { id: TENANT_ID } })
  const rules = getOvertimeRules((tenant as any)?.country)

  const employees = await prisma.employee.findMany({
    where: { tenantId: TENANT_ID, employeeCode: { startsWith: 'TST-' }, isDeleted: false },
    include: { schedule: true },
    orderBy: { employeeCode: 'asc' },
  })

  const holidays = await prisma.holiday.findMany({
    where: { tenantId: TENANT_ID, isDeleted: false },
    select: { date: true, name: true },
  })
  const holidayDates = new Set(holidays.map(h => h.date))

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('  VERIFICACIÓN DE CÁLCULOS DE HORAS EXTRAS — Redmi')
  console.log('═══════════════════════════════════════════════════════════════════\n')

  for (const emp of employees) {
    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId: emp.id, tenantId: TENANT_ID },
      orderBy: { date: 'asc' },
    })

    console.log(`\n──────────────────────────────────────────────────────────`)
    console.log(`  ${emp.firstName} ${emp.lastName} (${emp.employeeCode}) — Horario: ${emp.schedule?.name ?? '—'} (${emp.schedule?.type ?? '—'})`)
    console.log(`──────────────────────────────────────────────────────────`)

    let totalNoct = 0, totalSupl = 0, totalSuplN = 0, totalExtrao = 0

    for (const rec of records) {
      if (!rec.checkInTime || !rec.checkOutTime) continue

      const cur      = DateTime.fromISO(rec.date, { zone: TZ })
      const localIn  = DateTime.fromJSDate(rec.checkInTime,  { zone: TZ })
      const localOut = DateTime.fromJSDate(rec.checkOutTime, { zone: TZ })
      const isHoliday = holidayDates.has(rec.date)

      const schedDay = emp.schedule
        ? getScheduleDay(emp.schedule as any, cur, emp.scheduleStartDate ?? null)
        : null
      const isWork = schedDay?.isWorkDay ?? false
      const sMin   = getScheduledMinutes(schedDay, emp.schedule as any ?? { type: 'Fixed', days: [], lateToleranceMinutes: 0 })

      const reqMins = (schedDay as any)?.requiredMinutes
        ?? ((emp.schedule as any)?.requiredHoursPerDay ? (emp.schedule as any).requiredHoursPerDay * 60 : null)

      const segments = calcOvertimeSegments({
        checkIn: localIn, checkOut: localOut,
        scheduledEntry: schedDay?.entryTime ?? null,
        scheduledExit:  schedDay?.exitTime  ?? null,
        requiredMinutes: reqMins,
        isWorkDay: isWork, isHoliday,
        scheduleType: emp.schedule?.type ?? 'Fixed',
        date: cur,
      }, rules)

      let noct = 0, supl = 0, suplN = 0, extrao = 0
      for (const s of segments) {
        if (s.type === 'nocturnal')          noct   += s.minutes
        if (s.type === 'supplementary')      supl   += s.minutes
        if (s.type === 'supplementaryNight') suplN  += s.minutes
        if (s.type === 'extraordinary')      extrao += s.minutes
      }

      totalNoct += noct; totalSupl += supl; totalSuplN += suplN; totalExtrao += extrao

      const dayLabel = isHoliday ? '🔴 FERIADO' : !isWork ? '🟡 DESCANSO' : '🟢 Laborable'
      const inFmt  = localIn.toFormat('HH:mm')
      const outFmt = localOut.toFormat('HH:mm dd/MM')
      const parts: string[] = []
      if (noct)   parts.push(`Noct.25%: ${fmtMins(noct)}`)
      if (supl)   parts.push(`Supl.50%: ${fmtMins(supl)}`)
      if (suplN)  parts.push(`SupNoc.100%: ${fmtMins(suplN)}`)
      if (extrao) parts.push(`Extrao.100%: ${fmtMins(extrao)}`)

      const scheduled = isWork ? `Prog: ${schedDay?.entryTime ?? '?'}-${schedDay?.exitTime ?? '?'} (${fmtMins(sMin)})` : 'Día descanso'
      console.log(`  ${rec.date} ${dayLabel}  ${scheduled}`)
      console.log(`    Entrada: ${inFmt}  Salida: ${outFmt}`)
      if (parts.length) console.log(`    → ${parts.join('  |  ')}`)
      else              console.log(`    → Sin horas extras`)
    }

    console.log(`\n  TOTALES: Noct.25%=${fmtMins(totalNoct)}  Supl.50%=${fmtMins(totalSupl)}  SupNoc.100%=${fmtMins(totalSuplN)}  Extrao.100%=${fmtMins(totalExtrao)}`)
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════════')
  console.log('  FIN DE VERIFICACIÓN')
  console.log('═══════════════════════════════════════════════════════════════════\n')
}

main().then(() => prisma.$disconnect()).catch(e => { console.error('Error:', e); prisma.$disconnect() })
