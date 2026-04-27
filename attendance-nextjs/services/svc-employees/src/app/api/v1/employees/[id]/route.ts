import { withAdmin, apiOk } from '@attendance/shared'
import { updateEmployeeSchema } from '@/modules/employees/employees.schema'
import * as svc from '@/modules/employees/employees.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  return apiOk(await svc.getById(id, tenantId))
})

export const PUT = withAdmin(async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  const dto    = updateEmployeeSchema.parse(await req.json())
  return apiOk(await svc.update(id, tenantId, dto), 'Empleado actualizado.')
})

export const DELETE = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  return apiOk(null, 'Empleado eliminado.')
})
