import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { changeTenantPlan } from '@/modules/admin/admin.service'

const schema = z.object({
  planId:       z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ tenantId: string }> }) => {
  const { tenantId } = await params
  const body = schema.parse(await req.json())
  return apiOk(await changeTenantPlan(tenantId, body.planId, body.billingCycle), 'Suscripción actualizada.')
})
