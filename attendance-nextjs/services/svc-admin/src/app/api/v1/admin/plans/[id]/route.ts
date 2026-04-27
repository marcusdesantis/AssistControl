import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { updatePlan, deletePlan, getPlanTenants, reassignAndDeletePlan } from '@/modules/admin/admin.service'

const updateSchema = z.object({
  name:          z.string().min(1).optional(),
  description:   z.string().optional(),
  priceMonthly:  z.number().min(0).optional(),
  priceAnnual:   z.number().min(0).optional(),
  maxEmployees:  z.number().int().positive().nullable().optional(),
  features:      z.array(z.string()).optional(),
  capabilities:  z.record(z.object({ enabled: z.boolean(), limit: z.number().int().positive().nullable().optional() })).optional(),
  sortOrder:     z.number().int().optional(),
  isActive:      z.boolean().optional(),
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = updateSchema.parse(await req.json())
  return apiOk(await updatePlan(id, body as Parameters<typeof updatePlan>[1]), 'Plan actualizado.')
})

export const GET = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await getPlanTenants(id))
})

export const DELETE = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const url = new URL(req.url)
  const targetPlanId = url.searchParams.get('reassignTo')
  if (targetPlanId) {
    await reassignAndDeletePlan(id, targetPlanId)
  } else {
    await deletePlan(id)
  }
  return apiOk(null, 'Plan eliminado.')
})
