import { withAdmin, apiOk } from '@attendance/shared'
import { prisma } from '@attendance/shared'

export const GET = withAdmin(async (req, { tenantId }) => {
  const p       = new URL(req.url).searchParams
  const page    = Number(p.get('page'))     || 1
  const limit   = Number(p.get('pageSize')) || 50
  const module  = p.get('module') ?? undefined
  const search  = p.get('search') ?? undefined

  const where: any = { tenantId }
  if (module) where.module = module
  if (search) where.OR = [
    { userName:  { contains: search, mode: 'insensitive' } },
    { userEmail: { contains: search, mode: 'insensitive' } },
    { action:    { contains: search, mode: 'insensitive' } },
  ]

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return apiOk({ items, total, page, pageSize: limit })
})
