import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

// Mirrors .NET GET /mobile/status — returns { isCheckedIn, isCheckedOut, today }
export const GET = withEmployee(async (_req: Request, { employeeId, tenantId }) => {
  const status  = await svc.getTodayStatus(employeeId, tenantId)
  const records = status.records
  // active = has check-in but no check-out
  const active        = records.find(r => r.checkInTime !== null && r.checkOutTime === null) ?? null
  // most recent record of the day for display
  const displayRecord = records.length > 0 ? records[records.length - 1] : null
  return apiOk({
    isCheckedIn:  active !== null,
    isCheckedOut: active === null && records.length > 0,
    today:        displayRecord,
  })
})
