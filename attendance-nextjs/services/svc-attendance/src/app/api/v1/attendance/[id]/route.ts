import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
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
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'attendance.update', module: 'attendance', detail: { recordId: id, status: data.status }, ip: getClientIp(req) })
  return apiOk(result, 'Registro actualizado.')
})

export const DELETE = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  await svc.removeRecord(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'attendance.delete', module: 'attendance', detail: { recordId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Registro eliminado.')
})
