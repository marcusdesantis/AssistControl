import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/employees/employees.service'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  await svc.sendCredentials(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.send_credentials', module: 'employees', detail: { employeeId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Credenciales enviadas.')
})
