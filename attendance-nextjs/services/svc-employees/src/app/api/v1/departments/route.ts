import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/departments/departments.service'

const bodySchema = z.object({ name: z.string().min(1), description: z.string().nullish() })

export const GET = withPlanGate('organization', async (req: Request, { tenantId }) => {
  const q        = new URL(req.url).searchParams
  const page     = Number(q.get('page'))     || 1
  const pageSize = Number(q.get('pageSize')) || 10
  const search   = q.get('search') ?? undefined
  return apiOk(await svc.getAll(tenantId, page, pageSize, search))
})

export const POST = withPlanGate('organization', async (req: Request, { tenantId, admin }) => {
  const { name, description } = bodySchema.parse(await req.json())
  const result = await svc.create(tenantId, name, description)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'department.create', module: 'organization', detail: { name }, ip: getClientIp(req) })
  return apiOk(result, 'Departamento creado.')
})

