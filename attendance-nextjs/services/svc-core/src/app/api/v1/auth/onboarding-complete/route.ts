import { withAdmin, apiOk, prisma } from '@attendance/shared'

export const PUT = withAdmin(async (_req, { tenantId }) => {
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { onboardingCompleted: true },
  })
  return apiOk(null, 'Onboarding completado.')
})
