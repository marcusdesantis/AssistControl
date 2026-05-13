import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { updateSettingsSchema } from '@/modules/tenants/tenants.schema'
import * as svc from '@/modules/tenants/tenants.service'

export const GET = withAdmin(async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getSettings(tenantId))
})

export const PUT = withAdmin(async (req: Request, { tenantId, admin }) => {
  const body = await req.json() as Record<string, unknown>
  const dto  = updateSettingsSchema.parse(body)
  const result = await svc.updateSettings(tenantId, dto)
  const tab = 'smtpHost' in body ? 'email'
    : 'checkerRequires2FA' in body ? 'checker'
    : 'invitationExpirationHours' in body ? 'registro'
    : 'settings'
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: `settings.save_${tab}`, module: 'settings', ip: getClientIp(req) })
  return apiOk(result, 'Configuración guardada.')
})
