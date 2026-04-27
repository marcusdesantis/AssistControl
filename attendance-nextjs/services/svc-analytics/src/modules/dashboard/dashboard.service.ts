import { prisma } from '@attendance/shared'
import { DateTime } from 'luxon'

export async function getStats(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({
      where:  { tenantId, isDeleted: false, status: 'Active' },
      select: { id: true },
    }),
    prisma.attendanceRecord.findMany({
      where:  { tenantId, date: today, isDeleted: false },
      select: { employeeId: true, status: true, checkInTime: true },
    }),
  ])

  const total    = employees.length
  const recMap   = new Map(records.map(r => [r.employeeId, r]))
  const present  = records.filter(r => r.status === 'Present').length
  const late     = records.filter(r => r.status === 'Late').length
  const absent   = records.filter(r => r.status === 'Absent').length
  const noRecord = employees.filter(e => !recMap.has(e.id)).length

  return { total, present, late, absent, noRecord, date: today }
}
