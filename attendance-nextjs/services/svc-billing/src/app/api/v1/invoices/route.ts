import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/billing/billing.service'

export const GET = withAdmin(async (req, { tenantId }) => {
  const p        = new URL(req.url).searchParams
  const page     = Number(p.get('page')     ?? 1)
  const pageSize = Number(p.get('pageSize') ?? 10)
  return apiOk(await svc.getInvoices(tenantId, page, pageSize))
})
