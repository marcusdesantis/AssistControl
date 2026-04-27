import { withAdmin, apiOk, prisma } from '@attendance/shared'

export const GET = withAdmin(async (req, { tenantId }) => {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))

  const type      = searchParams.get('type')      ?? undefined
  const search    = searchParams.get('search')    ?? undefined
  const dateFrom  = searchParams.get('dateFrom')  ?? undefined
  const dateTo    = searchParams.get('dateTo')    ?? undefined

  const where = {
    tenantId,
    forAdmin:    false,
    forEmployee: false,
    ...(type   ? { type }                                              : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    ...((dateFrom || dateTo) ? { createdAt: {
      ...(dateFrom ? { gte: new Date(dateFrom) }                    : {}),
      ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') }   : {}),
    }} : {}),
  }

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ])

  return apiOk({ items, total, totalPages: Math.ceil(total / pageSize), unread })
})

export const PATCH = withAdmin(async (req, { tenantId }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? undefined

  await prisma.notification.updateMany({
    where: { tenantId, forAdmin: false, forEmployee: false, isRead: false, ...(id ? { id } : {}) },
    data:  { isRead: true },
  })
  return apiOk({ ok: true })
})
