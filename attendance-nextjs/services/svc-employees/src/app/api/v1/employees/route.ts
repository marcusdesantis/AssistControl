import { withAdmin, apiOk, apiCreated } from '@attendance/shared'
import { createEmployeeSchema } from '@/modules/employees/employees.schema'
import * as svc from '@/modules/employees/employees.service'

export const GET = withAdmin(async (req: Request, { tenantId }) => {
  const q          = new URL(req.url).searchParams
  const page       = Number(q.get('page'))       || 1
  const pageSize   = Number(q.get('pageSize'))   || 20
  const search     = q.get('search')     ?? undefined
  const departmentId = q.get('departmentId') ?? undefined
  const status     = q.get('status')     ?? undefined
  return apiOk(await svc.getAll(tenantId, page, pageSize, search, departmentId, status))
})

export const POST = withAdmin(async (req: Request, { tenantId }) => {
  const dto    = createEmployeeSchema.parse(await req.json())
  const result = await svc.create(tenantId, dto)
  return apiCreated(result, 'Empleado creado.')
})
