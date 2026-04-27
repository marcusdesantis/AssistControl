import { withAdmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { calculateProration } from '@/modules/billing/billing.service'

const schema = z.object({
  planId:       z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']),
})

export const POST = withAdmin(async (req, { tenantId }) => {
  const { planId, billingCycle } = schema.parse(await req.json())
  const proration = await calculateProration(tenantId, planId, billingCycle)
  return apiOk(proration)
})
