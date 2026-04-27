import { withEmployee, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/mobile/mobile.service'

const schema = z.object({ pushToken: z.string().nullish() })

// .NET uses PUT with { PushToken }
export const PUT = withEmployee(async (req: Request, { employeeId, tenantId }) => {
  const { pushToken } = schema.parse(await req.json())
  await svc.updatePushToken(employeeId, tenantId, pushToken ?? '')
  return apiOk(null, 'Token actualizado.')
})
