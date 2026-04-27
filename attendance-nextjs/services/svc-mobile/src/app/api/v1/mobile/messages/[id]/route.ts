import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = withEmployee(async (_req: Request, { employeeId, tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.deleteMessage(id, employeeId, tenantId)
  return apiOk(null, 'Mensaje eliminado.')
})
