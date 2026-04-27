import { z } from 'zod'

export const updateProfileSchema = z.object({
  name:            z.string().min(1),
  legalName:       z.string().nullish(),
  taxId:           z.string().nullish(),
  businessLicense: z.string().nullish(),
  logoBase64:      z.string().nullish(),
  street:          z.string().nullish(),
  betweenStreets:  z.string().nullish(),
  neighborhood:    z.string().nullish(),
  city:            z.string().nullish(),
  postalCode:      z.string().nullish(),
  municipality:    z.string().nullish(),
  state:           z.string().nullish(),
  phone1:          z.string().nullish(),
  phone2:          z.string().nullish(),
  fax:             z.string().nullish(),
  email:           z.string().email().nullish().or(z.literal('')),
  website:         z.string().nullish(),
})

export const updateSettingsSchema = z.object({
  employeeCodePrefix:          z.string().min(1).default('EMP-'),
  invitationExpirationHours:   z.number().int().min(1).default(48),
  invitationEmails:            z.string().nullish(),
  smtpEnabled:                 z.boolean().default(false),
  smtpHost:                    z.string().nullish(),
  smtpPort:                    z.number().int().default(587),
  smtpUsername:                z.string().nullish(),
  smtpPassword:                z.string().nullish(),
  smtpFromName:                z.string().nullish(),
  smtpEnableSsl:               z.boolean().default(true),
  checkerKey:                  z.string().nullish(),
  checkerRequires2FA:          z.boolean().default(false),
  checkerOtpExpirationMinutes: z.number().int().default(5),
})

export const sendInvitationSchema = z.object({
  assignedCode: z.string().nullish(),
  scheduleId:   z.string().uuid().nullish(),
})

export type UpdateProfileDto  = z.infer<typeof updateProfileSchema>
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>
export type SendInvitationDto = z.infer<typeof sendInvitationSchema>
