import { withSuperadmin, apiOk } from '@attendance/shared'
import { listSubscriptions } from '@/modules/admin/admin.service'

export const GET = withSuperadmin(async (req) => {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const search   = searchParams.get('search') ?? undefined
  return apiOk(await listSubscriptions(page, pageSize, search))
})
