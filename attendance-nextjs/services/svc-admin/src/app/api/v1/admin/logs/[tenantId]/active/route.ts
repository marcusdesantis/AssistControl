import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

type Ctx = { params: Promise<{ tenantId: string }> }

// GET /api/v1/admin/logs/:tenantId/active  → logs activos del mes en curso desde la DB
// Caso especial: tenantId === '__deleted__' + ?tenantName=xxx → filtra por tenantName (empresa eliminada)
export const GET = withSuperadmin(async (req, _ctx, { params }: Ctx) => {
  const { tenantId } = await params
  const p        = new URL(req.url).searchParams
  const page     = Number(p.get('page'))     || 1
  const pageSize = Number(p.get('pageSize')) || 50
  const module   = p.get('module') ?? undefined
  const search   = p.get('search') ?? undefined
  const from     = p.get('from') ?? undefined
  const to       = p.get('to')   ?? undefined

  const isDeleted  = tenantId === '__deleted__'
  const tenantName = p.get('tenantName') ?? undefined

  const where: any = isDeleted
    ? { tenantId: null, ...(tenantName ? { tenantName } : {}) }
    : { tenantId }
  if (module) where.module = module
  if (search) where.OR = [
    { userName: { contains: search, mode: 'insensitive' } },
    { action:   { contains: search, mode: 'insensitive' } },
  ]
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from + 'T00:00:00.000Z')
    if (to)   where.createdAt.lte = new Date(to   + 'T23:59:59.999Z')
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return apiOk({ items, total, page, pageSize })
})
