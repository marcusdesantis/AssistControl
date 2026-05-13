import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  reportType:  z.string(),
  format:      z.enum(['pdf', 'excel']),
  from:        z.string(),
  to:          z.string(),
  employeeCode: z.string().nullish(),
})

export const POST = withPlanGate('reports', async (req: Request, { tenantId, admin }) => {
  const body = schema.parse(await req.json())
  createLog({
    tenantId,
    userId:   admin.sub,
    userName: admin.username,
    action:   'report.download',
    module:   'reports',
    detail:   { reportType: body.reportType, format: body.format, from: body.from, to: body.to, employeeCode: body.employeeCode },
    ip:       getClientIp(req),
  })
  return apiOk(null)
})
