import { z } from 'zod'

const daySchema = z.object({
  day:        z.number().int().min(0).max(6),
  isWorkDay:  z.boolean(),
  entryTime:  z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  exitTime:   z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  hasLunch:   z.boolean(),
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  lunchEnd:   z.string().regex(/^\d{2}:\d{2}$/).nullish(),
})

export const bodySchema = z.object({
  name:                 z.string().min(1),
  type:                 z.enum(['Fixed', 'Flexible', 'Shift']),
  lateToleranceMinutes: z.number().int().min(0).default(0),
  requiredHoursPerDay:  z.number().positive().nullish(),
  days:                 z.array(daySchema).min(1),
})
