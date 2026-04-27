import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { getTenantDetail, updateTenant, toggleTenantActive } from '@/modules/admin/admin.service'

export const GET = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await getTenantDetail(id))
})

const updateSchema = z.object({
  name:      z.string().min(1).optional(),
  legalName: z.string().optional(),
  country:   z.string().length(2).optional(),
  timeZone:  z.string().optional(),
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = updateSchema.parse(await req.json())
  return apiOk(await updateTenant(id, body), 'Tenant actualizado.')
})

export const POST = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await toggleTenantActive(id), 'Estado actualizado.')
})
