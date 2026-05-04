import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { getSystemSettings, updateSystemSettings } from '@/modules/admin/admin.service'

const schema = z.object({
  smtpEnabled:              z.boolean().optional(),
  smtpHost:                 z.string().nullable().optional(),
  smtpPort:                 z.number().int().optional(),
  smtpUsername:             z.string().nullable().optional(),
  smtpPassword:             z.string().nullable().optional(),
  smtpFromName:             z.string().nullable().optional(),
  smtpFromEmail:            z.string().email().nullable().optional(),
  smtpEnableSsl:            z.boolean().optional(),
  gracePeriodDays:          z.number().int().min(0).max(30).optional(),
  expiryReminderEnabled:    z.boolean().optional(),
  expiryReminderTarget:     z.enum(['admin', 'company', 'both']).optional(),
  expiryReminderDays:       z.string().optional(),
  requireApproval:          z.boolean().optional(),
  termsOfUse:               z.string().nullable().optional(),
  privacyPolicy:            z.string().nullable().optional(),
  supportWhatsapp:          z.string().nullable().optional(),
  supportPhone:             z.string().nullable().optional(),
  supportEmail:             z.string().nullable().optional(),
})

export const GET = withSuperadmin(async () => {
  const s = await getSystemSettings()
  return apiOk({ ...s, smtpPassword: s.smtpPassword ? '••••••••' : null })
})

export const PATCH = withSuperadmin(async (req) => {
  const body = schema.parse(await req.json())
  const data = { ...body }
  if (data.smtpPassword === '••••••••') delete data.smtpPassword
  return apiOk(await updateSystemSettings(data))
})
