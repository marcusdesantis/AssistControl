import { z } from 'zod'

const daySchema = z.object({
  day:              z.number().int().min(0).max(6),
  isWorkDay:        z.boolean(),
  entryTime:        z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  exitTime:         z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  hasLunch:         z.boolean(),
  lunchStart:       z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  lunchEnd:         z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  requiredMinutes:  z.number().int().min(0).nullish(),
})

export const bodySchema = z.object({
  name:                 z.string().min(1),
  type:                 z.enum(['Fixed', 'Variable', 'Rotativo']),
  lateToleranceMinutes: z.number().int().min(0).default(0),
  requiredHoursPerDay:  z.number().positive().nullish(),
  days:                 z.union([z.array(daySchema).min(1), z.array(z.array(daySchema).min(1)).min(1)]),
  rotationWeeks:        z.number().int().min(2).max(4).nullish(),
  rotationStartDate:    z.string().nullish(),
})
