import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/departments/departments.service'

const bodySchema = z.object({ name: z.string().min(1), description: z.string().nullish() })
type Ctx = { params: Promise<{ id: string }> }

export const PUT = withPlanGate('organization', async(req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id }                = await params
  const { name, description } = bodySchema.parse(await req.json())
  const result = await svc.update(id, tenantId, name, description)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'department.update', module: 'organization', detail: { name }, ip: getClientIp(req) })
  return apiOk(result, 'Departamento actualizado.')
})

export const DELETE = withPlanGate('organization', async(req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id }        = await params
  const reassignToId  = new URL(req.url).searchParams.get('reassignToId') ?? undefined
  await svc.remove(id, tenantId, reassignToId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'department.delete', module: 'organization', detail: { departmentId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Departamento eliminado.')
})
