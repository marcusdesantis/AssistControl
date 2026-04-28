import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/support/support.service'

export const GET = withAdmin(async () => {
  return apiOk(await svc.getSupportInfo())
})
