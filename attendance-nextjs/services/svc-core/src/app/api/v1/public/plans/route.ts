import { withPublic, apiOk } from '@attendance/shared'
import { prisma } from '@attendance/shared'

export const GET = withPublic(async () => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, description: true,
      priceMonthly: true, priceAnnual: true,
      maxEmployees: true, features: true,
      isFree: true, isDefault: true, sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' },
  })
  return apiOk(plans)
})
