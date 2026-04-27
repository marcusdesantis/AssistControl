import { withSuperadmin, apiOk, prisma } from '@attendance/shared'

export const PATCH = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await prisma.notification.updateMany({
    where: { id, forAdmin: true },
    data:  { isRead: true },
  })
  return apiOk({ ok: true })
})
