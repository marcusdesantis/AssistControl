import { withEmployee, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/mobile/mobile.service'

const schema = z.object({ pin: z.string().min(1) })

export const POST = withEmployee(async (req: Request, { employeeId, tenantId }) => {
  const { pin } = schema.parse(await req.json())
  return apiOk(await svc.requestOtp(employeeId, tenantId, pin))
})
