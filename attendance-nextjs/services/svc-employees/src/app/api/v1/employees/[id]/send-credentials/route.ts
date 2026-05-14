import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/employees/employees.service'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withAdmin(async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const emp = await svc.getById(id, tenantId)
  await svc.sendCredentials(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.send_credentials', module: 'employees', detail: { name: emp.fullName, code: emp.employeeCode }, ip: getClientIp(req) })
  return apiOk(null, 'Credenciales enviadas.')
})
