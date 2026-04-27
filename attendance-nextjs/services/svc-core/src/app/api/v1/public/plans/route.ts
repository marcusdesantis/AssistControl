import { withPublic, apiOk } from '@attendance/shared'
import { prisma } from '@attendance/shared'

export const GET = withPublic(async () => {
  const plan = await prisma.plan.findFirst({
    where: { isDefault: true, isActive: true },
    select: { name: true, maxEmployees: true, priceMonthly: true },
  })
  return apiOk(plan ?? { name: 'Gratuito', maxEmployees: 10, priceMonthly: 0 })
})
