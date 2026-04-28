import { withSuperadmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/support/support.service'

export const GET = withSuperadmin(async (req) => {
  const p        = new URL(req.url).searchParams
  const page     = Math.max(1, parseInt(p.get('page')     ?? '1'))
  const pageSize = Math.min(50, parseInt(p.get('pageSize') ?? '20'))
  const status   = p.get('status')   ?? undefined
  const priority = p.get('priority') ?? undefined
  return apiOk(await svc.adminGetTickets({ page, pageSize, status, priority }))
})
