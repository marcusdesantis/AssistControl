import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { listPlans, createPlan } from '@/modules/admin/admin.service'

export const GET = withSuperadmin(async () => {
  return apiOk(await listPlans())
})

const createSchema = z.object({
  name:          z.string().min(1),
  description:   z.string().default(''),
  priceMonthly:  z.number().min(0),
  priceAnnual:   z.number().min(0).optional(),
  maxEmployees:  z.number().int().positive().optional(),
  isFree:        z.boolean().default(false),
  features:      z.array(z.string()).default([]),
  capabilities:  z.record(z.object({ enabled: z.boolean(), limit: z.number().int().positive().nullable().optional() })).default({}),
  sortOrder:     z.number().int().default(0),
})

export const POST = withSuperadmin(async (req) => {
  const body = createSchema.parse(await req.json())
  return apiOk(await createPlan(body), 'Plan creado.')
})
