import { withPlanGate, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/positions/positions.service'

const bodySchema = z.object({ name: z.string().min(1), description: z.string().nullish() })

export const GET = withPlanGate('organization', async (req: Request, { tenantId }) => {
  const q        = new URL(req.url).searchParams
  const page     = Number(q.get('page'))     || 1
  const pageSize = Number(q.get('pageSize')) || 10
  const search   = q.get('search') ?? undefined
  return apiOk(await svc.getAll(tenantId, page, pageSize, search))
})

export const POST = withPlanGate('organization', async (req: Request, { tenantId }) => {
  const { name, description } = bodySchema.parse(await req.json())
  return apiOk(await svc.create(tenantId, name, description), 'Cargo creado.')
})

