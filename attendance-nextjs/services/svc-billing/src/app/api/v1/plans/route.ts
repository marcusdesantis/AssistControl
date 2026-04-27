import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/billing/billing.service'

export const GET = withAdmin(async () => {
  return apiOk(await svc.getPlans())
})
