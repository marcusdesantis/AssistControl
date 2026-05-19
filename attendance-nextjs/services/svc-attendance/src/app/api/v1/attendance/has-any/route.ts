import { withAdmin, apiOk, prisma } from '@attendance/shared'

export const GET = withAdmin(async (_req, { tenantId }) => {
  const count = await prisma.attendanceRecord.count({
    where: { tenantId, isDeleted: false, checkInTime: { not: null } },
  })
  return apiOk({ hasAny: count > 0 })
})
