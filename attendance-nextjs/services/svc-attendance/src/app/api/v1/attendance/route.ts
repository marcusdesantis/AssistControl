import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/attendance/attendance.service'

// GET /attendance?date=YYYY-MM-DD  → flat list (dashboard compat)
export const GET = withAdmin(async (req: Request, { tenantId }) => {
  const date   = new URL(req.url).searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const result = await svc.getDayView(tenantId, date, 1, 500)
  const flat   = result.items.flatMap((row: any) =>
    row.records.length > 0
      ? row.records.map((r: any) => ({
          ...r,
          employeeId:   row.employeeId,
          employeeCode: row.employeeCode,
          employeeName: row.fullName,
          department:   row.department,
        }))
      : [],
  )
  return apiOk(flat)
})
