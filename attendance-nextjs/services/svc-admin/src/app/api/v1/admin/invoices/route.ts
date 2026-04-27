import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

export const GET = withSuperadmin(async (req) => {
  const url      = new URL(req.url)
  const page     = parseInt(url.searchParams.get('page')     ?? '1',  10)
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
  const search = url.searchParams.get('search')?.trim() || undefined

  const where = search ? {
    OR: [
      { tenant:   { name:    { contains: search, mode: 'insensitive' as const } } },
      { planName: { contains: search, mode: 'insensitive' as const } },
      { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
    ],
  } : {}

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        tenant: { select: { id: true, name: true, taxId: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ])

  return apiOk({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})
