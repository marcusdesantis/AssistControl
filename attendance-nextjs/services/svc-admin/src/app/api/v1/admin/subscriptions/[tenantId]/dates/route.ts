import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { updateSubscriptionDates } from '@/modules/admin/admin.service'

const schema = z.object({
  currentPeriodStart: z.string().nullable().optional(),
  currentPeriodEnd:   z.string().nullable().optional(),
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ tenantId: string }> }) => {
  const { tenantId } = await params
  const body = schema.parse(await req.json())
  return apiOk(
    await updateSubscriptionDates(tenantId, body.currentPeriodStart ?? null, body.currentPeriodEnd ?? null),
    'Fechas actualizadas.'
  )
})
