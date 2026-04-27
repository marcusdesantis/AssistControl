import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/employees/employees.service'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.sendCredentials(id, tenantId)
  return apiOk(null, 'Credenciales enviadas.')
})
