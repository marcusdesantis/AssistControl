import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

export const GET = withSuperadmin(async (req: Request) => {
  const p      = new URL(req.url).searchParams
  const page   = Math.max(1, Number(p.get('page'))     || 1)
  const limit  = Math.min(100, Number(p.get('pageSize')) || 50)
  const search = p.get('search') ?? undefined
  const from   = p.get('from')   ?? undefined
  const to     = p.get('to')     ?? undefined

  const dateFilter = (from || to) ? {
    gte: from ? new Date(from) : undefined,
    lte: to   ? new Date(`${to}T23:59:59`) : undefined,
  } : undefined

  const searchFilter = search ? { contains: search, mode: 'insensitive' as const } : undefined

  // 1. Pendientes de verificación (PendingRegistration)
  const pendingWhere: any = {}
  if (searchFilter) pendingWhere.OR = [{ companyName: searchFilter }, { email: searchFilter }, { username: searchFilter }]
  if (dateFilter)   pendingWhere.createdAt = dateFilter

  // 2. Ya verificados (Tenant selfRegistered)
  const tenantWhere: any = { selfRegistered: true, isDeleted: false }
  if (searchFilter) tenantWhere.OR = [{ name: searchFilter }]
  if (dateFilter)   tenantWhere.createdAt = dateFilter

  const [pending, tenants] = await Promise.all([
    prisma.pendingRegistration.findMany({ where: pendingWhere, orderBy: { createdAt: 'desc' } }),
    prisma.tenant.findMany({
      where: tenantWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, isActive: true, pendingApproval: true, emailVerified: true, createdAt: true,
        users: { where: { role: 'Admin', isDeleted: false }, select: { email: true, username: true }, take: 1 },
      },
    }),
  ])

  const now       = new Date()
  const GRACE_DAYS = 3

  const pendingItems = pending.map(r => {
    const deletesAt = new Date(r.expiresAt)
    deletesAt.setDate(deletesAt.getDate() + GRACE_DAYS)
    return {
      id:          r.id,
      companyName: r.companyName,
      email:       r.email,
      username:    r.username,
      status:      r.expiresAt < now ? 'expired' : 'pending',
      createdAt:   r.createdAt.toISOString(),
      expiresAt:   r.expiresAt.toISOString(),
      deletesAt:   deletesAt.toISOString(),
      tenantId:    null,
    }
  })

  const tenantItems = tenants.map(t => ({
    id:          t.id,
    companyName: t.name,
    email:       t.users[0]?.email    ?? null,
    username:    t.users[0]?.username ?? null,
    status:      t.pendingApproval ? 'pending_approval' : t.isActive ? 'active' : 'inactive',
    createdAt:   t.createdAt.toISOString(),
    expiresAt:   null,
    deletesAt:   null,
    tenantId:    t.id,
  }))

  // Combinar y ordenar por fecha desc
  const all = [...pendingItems, ...tenantItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const total = all.length
  const items = all.slice((page - 1) * limit, page * limit)

  return apiOk({ items, total, page, pageSize: limit })
})
