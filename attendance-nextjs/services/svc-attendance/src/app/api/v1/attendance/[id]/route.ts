import { withAdmin, apiOk, createLog, getClientIp, prisma } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/attendance/attendance.service'

const updateSchema = z.object({
  checkInTime:  z.string().nullish(),
  checkOutTime: z.string().nullish(),
  notes:        z.string().nullish(),
  status:       z.enum(['Present', 'Late', 'Absent', 'Excused']).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const data   = updateSchema.parse(await req.json())
  const result = await svc.updateRecord(id, tenantId, data)
  const dateStr = result.date instanceof Date ? result.date.toISOString().slice(0,10) : String(result.date ?? '').slice(0,10)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'attendance.update', module: 'attendance', detail: { name: result.employeeName, code: result.employeeCode, date: dateStr }, ip: getClientIp(req) })
  return apiOk(result, 'Registro actualizado.')
})

export const DELETE = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const rec = await prisma.attendanceRecord.findFirst({ where: { id, tenantId }, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } } })
  await svc.removeRecord(id, tenantId)
  const recName = rec?.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : undefined
  const recDate = rec?.date ? new Date(rec.date).toISOString().slice(0,10) : undefined
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'attendance.delete', module: 'attendance', detail: { name: recName, code: rec?.employee?.employeeCode, date: recDate }, ip: getClientIp(req) })
  return apiOk(null, 'Registro eliminado.')
})
