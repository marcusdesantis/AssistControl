import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

type Ctx = { params: Promise<{ id: string }> }

// .NET uses POST (not PATCH)
export const POST = withEmployee(async (_req: Request, { employeeId, tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.markMessageRead(id, employeeId, tenantId)
  return apiOk(null, 'Mensaje marcado como leído.')
})
