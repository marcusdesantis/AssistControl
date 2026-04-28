import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/support/support.service'

const patchSchema = z.object({
  status:   z.enum(['open', 'pending', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

export const GET = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await svc.adminGetTicket(id))
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = patchSchema.parse(await req.json())
  return apiOk(await svc.adminUpdateTicket(id, body))
})
