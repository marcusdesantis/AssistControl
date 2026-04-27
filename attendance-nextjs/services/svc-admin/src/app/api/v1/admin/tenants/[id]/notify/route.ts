import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  body:  z.string().min(1),
  type:  z.enum(['info', 'success', 'warning', 'error']).default('info'),
})

export const POST = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id }          = await params
  const { title, body, type } = schema.parse(await req.json())

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  const notif = await prisma.notification.create({
    data: { tenantId: id, forAdmin: false, title, body, type },
  })

  return apiOk(notif, 'Notificación enviada.')
})
