import { withEmployee, apiOk, prisma } from '@attendance/shared'

export const GET = withEmployee(async (req, { tenantId, employeeId }) => {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
  const skip     = (page - 1) * pageSize

  const where = {
    tenantId,
    forEmployee: true,
    OR: [
      { employeeId },
      { employeeId: null },
    ],
  }

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ])

  return apiOk({
    items,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    pageSize,
    unread,
  })
})

export const PATCH = withEmployee(async (req, { tenantId, employeeId }) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? undefined

  const where = id
    ? { id, tenantId, forEmployee: true, OR: [{ employeeId }, { employeeId: null }] }
    : { tenantId, forEmployee: true, OR: [{ employeeId }, { employeeId: null }], isRead: false }

  await prisma.notification.updateMany({ where, data: { isRead: true } })
  return apiOk(null, 'Notificaciones actualizadas.')
})
