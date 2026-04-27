import { withAdmin, apiOk, prisma } from '@attendance/shared'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await prisma.notification.updateMany({
    where: { id, tenantId, forAdmin: false },
    data:  { isRead: true },
  })
  return apiOk({ ok: true })
})
