import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { updateEmployeeSchema } from '@/modules/employees/employees.schema'
import * as svc from '@/modules/employees/employees.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  return apiOk(await svc.getById(id, tenantId))
})

export const PUT = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const dto    = updateEmployeeSchema.parse(await req.json())
  const result = await svc.update(id, tenantId, dto)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.update', module: 'employees', detail: { employeeId: id }, ip: getClientIp(req) })
  return apiOk(result, 'Empleado actualizado.')
})

export const DELETE = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.delete', module: 'employees', detail: { employeeId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Empleado eliminado.')
})
