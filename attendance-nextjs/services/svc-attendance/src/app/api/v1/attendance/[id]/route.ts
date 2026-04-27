import { withAdmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/attendance/attendance.service'

const updateSchema = z.object({
  checkInTime:  z.string().nullish(),
  checkOutTime: z.string().nullish(),
  notes:        z.string().nullish(),
  status:       z.enum(['Present', 'Late', 'Absent', 'Excused']).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withAdmin(async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  const data   = updateSchema.parse(await req.json())
  return apiOk(await svc.updateRecord(id, tenantId, data), 'Registro actualizado.')
})

export const DELETE = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.removeRecord(id, tenantId)
  return apiOk(null, 'Registro eliminado.')
})
