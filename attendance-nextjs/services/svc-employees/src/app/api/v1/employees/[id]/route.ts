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
  const STATUS_ES: Record<string, string> = { Active: 'Activo', Inactive: 'Inactivo', OnLeave: 'De baja' }
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.update', module: 'employees', detail: { name: result.fullName, code: result.employeeCode, status: dto.status ? STATUS_ES[dto.status] ?? dto.status : undefined }, ip: getClientIp(req) })
  return apiOk(result, 'Empleado actualizado.')
})

export const DELETE = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const emp = await svc.getById(id, tenantId)
  await svc.remove(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.delete', module: 'employees', detail: { name: emp.fullName, code: emp.employeeCode }, ip: getClientIp(req) })
  return apiOk(null, 'Empleado eliminado.')
})
