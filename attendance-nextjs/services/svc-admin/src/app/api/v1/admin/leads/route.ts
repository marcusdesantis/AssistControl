import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

export const GET = withSuperadmin(async (req: Request) => {
  const p      = new URL(req.url).searchParams
  const page   = Math.max(1, Number(p.get('page'))     || 1)
  const limit  = Math.min(100, Number(p.get('pageSize')) || 50)
  const pageFilter = p.get('page_filter') ?? undefined
  const option     = p.get('option')      ?? undefined
  const from       = p.get('from')        ?? undefined
  const to         = p.get('to')          ?? undefined

  const where: any = {}
  if (pageFilter) where.page = pageFilter
  if (option)     where.option = { contains: option, mode: 'insensitive' }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to)   where.createdAt.lte = new Date(`${to}T23:59:59`)
  }

  const [items, total] = await Promise.all([
    prisma.leadEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.leadEvent.count({ where }),
  ])

  return apiOk({ items, total, page, pageSize: limit })
})
