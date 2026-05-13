import { withEmployee, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

export const POST = withEmployee(async (req: Request, { employeeId, tenantId, employee }) => {
  const result = await svc.checkOut(employeeId, tenantId)
  createLog({ tenantId, userId: employeeId, userName: employee.employeeCode, action: 'mobile.checkout', module: 'mobile', ip: getClientIp(req), source: 'mobile' })
  return apiOk(result)
})
