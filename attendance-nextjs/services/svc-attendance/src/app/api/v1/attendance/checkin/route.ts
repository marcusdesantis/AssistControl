import { withAdmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/attendance/attendance.service'

const schema = z.object({
  employeeId:     z.string().uuid(),
  notes:          z.string().nullish(),
  latitude:       z.number().nullish(),
  longitude:      z.number().nullish(),
  registeredFrom: z.string().default('Web'),
})

export const POST = withAdmin(async (req: Request, { tenantId }) => {
  const { employeeId, ...opts } = schema.parse(await req.json())
  return apiOk(await svc.checkIn(tenantId, employeeId, opts), 'Entrada registrada.')
})
