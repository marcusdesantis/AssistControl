import { withAdmin, apiOk, prisma } from '@attendance/shared'

export const PUT = withAdmin(async (_req, { tenantId }) => {
  await prisma.tenant.update({ where: { id: tenantId }, data: { setupCelebrated: true } })
  return apiOk(null)
})
