import { withAdmin, apiOk, prisma, sendExpoPush } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  body:  z.string().min(1),
  type:  z.enum(['info', 'success', 'warning', 'error']).default('info'),
})

export const POST = withAdmin(async (req, { tenantId }, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { title, body, type } = schema.parse(await req.json())

  const employee = await prisma.employee.findFirst({
    where:  { id, tenantId, isDeleted: false },
    select: { id: true, expoPushToken: true },
  })
  if (!employee) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const notif = await prisma.notification.create({
    data: { tenantId, forAdmin: false, forEmployee: true, employeeId: id, title, body, type },
  })

  // Fire-and-forget — no falla el request si el push falla
  sendExpoPush(employee.expoPushToken, { title, body, data: { notifId: notif.id, type } })

  return apiOk(notif, 'Notificación enviada.')
})
