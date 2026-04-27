import { withPublic, apiOk } from '@attendance/shared'
import * as svc from '@/modules/tenants/tenants.service'

export const GET = withPublic(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  return apiOk(await svc.getInvitationInfo(token))
})
