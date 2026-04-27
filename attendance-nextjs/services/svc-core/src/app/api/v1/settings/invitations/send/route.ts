import { withAdmin, apiOk } from '@attendance/shared'
import { sendInvitationSchema } from '@/modules/tenants/tenants.schema'
import * as svc from '@/modules/tenants/tenants.service'

export const POST = withAdmin(async (req: Request, { tenantId }) => {
  const body = await req.json().catch(() => ({}))
  const dto  = sendInvitationSchema.parse(body)
  const baseUrl = req.headers.get('x-app-base-url')?.trimEnd()
    ?? new URL(req.url).origin
  return apiOk(await svc.sendInvitation(tenantId, dto, baseUrl), 'Invitación generada.')
})
