import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { sendInvitationSchema } from '@/modules/tenants/tenants.schema'
import * as svc from '@/modules/tenants/tenants.service'

export const POST = withAdmin(async (req: Request, { tenantId, admin }) => {
  const body = await req.json().catch(() => ({}))
  const dto  = sendInvitationSchema.parse(body)
  const baseUrl = req.headers.get('x-app-base-url')?.trimEnd()
    ?? new URL(req.url).origin
  const result = await svc.sendInvitation(tenantId, dto, baseUrl)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'settings.send_invitation', module: 'settings', detail: { count: dto.recipients.length }, ip: getClientIp(req) })
  return apiOk(result, 'Invitación generada.')
})
