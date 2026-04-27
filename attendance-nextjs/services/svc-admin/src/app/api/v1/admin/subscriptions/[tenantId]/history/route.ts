import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

export const GET = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ tenantId: string }> }) => {
  const { tenantId } = await params
  const url      = new URL(req.url)
  const page     = parseInt(url.searchParams.get('page')     ?? '1',  10)
  const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
  const search   = url.searchParams.get('search')?.trim() || undefined

  // Para filtrar por nombre de plan anterior también necesitamos los IDs que coincidan
  let matchingPlanIds: string[] = []
  if (search) {
    const plans = await prisma.plan.findMany({
      where: { name: { contains: search, mode: 'insensitive' } },
      select: { id: true },
    })
    matchingPlanIds = plans.map(p => p.id)
  }

  const where = search ? {
    tenantId,
    OR: [
      { plan: { name: { contains: search, mode: 'insensitive' as const } } },
      ...(matchingPlanIds.length > 0 ? [{ previousPlanId: { in: matchingPlanIds } }] : []),
    ],
  } : { tenantId }

  const [items, total] = await Promise.all([
    prisma.subscriptionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        plan: { select: { id: true, name: true } },
      },
    }),
    prisma.subscriptionLog.count({ where }),
  ])

  // Resolver nombres de planes anteriores
  const prevPlanIds = [...new Set(items.map(i => i.previousPlanId).filter(Boolean))] as string[]
  const prevPlans   = prevPlanIds.length
    ? await prisma.plan.findMany({ where: { id: { in: prevPlanIds } }, select: { id: true, name: true } })
    : []
  const prevPlanMap = Object.fromEntries(prevPlans.map(p => [p.id, p.name]))

  const enriched = items.map(item => ({
    ...item,
    previousPlanName: item.previousPlanId ? (prevPlanMap[item.previousPlanId] ?? 'Plan eliminado') : null,
  }))

  return apiOk({ items: enriched, total, page, pageSize })
})
