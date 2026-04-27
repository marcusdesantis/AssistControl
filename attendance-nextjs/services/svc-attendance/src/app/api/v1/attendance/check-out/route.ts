import { withAdmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/attendance/attendance.service'

const schema = z.object({
  employeeId: z.string().uuid(),
  notes:      z.string().nullish(),
})

async function handler(req: Request, tenantId: string) {
  const { employeeId, notes } = schema.parse(await req.json())
  return apiOk(await svc.checkOut(tenantId, employeeId, { notes: notes ?? undefined }), 'Salida registrada.')
}

export const POST = withAdmin(async (req: Request, { tenantId }) => handler(req, tenantId))
