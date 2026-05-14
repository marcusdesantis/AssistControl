import { withAdmin, apiOk, prisma, sendExpoPush, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  body:  z.string().min(1),
  type:  z.enum(['info', 'success', 'warning', 'error']).default('info'),
})

export const POST = withAdmin(async (req, { tenantId, admin }, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { title, body, type } = schema.parse(await req.json())

  const employee = await prisma.employee.findFirst({
    where:  { id, tenantId, isDeleted: false },
    select: { id: true, expoPushToken: true, firstName: true, lastName: true, employeeCode: true },
  })
  if (!employee) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const notif = await prisma.notification.create({
    data: { tenantId, forAdmin: false, forEmployee: true, employeeId: id, title, body, type },
  })

  sendExpoPush(employee.expoPushToken, { title, body, data: { notifId: notif.id, type } })
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'employee.notify', module: 'employees', detail: { name: `${employee.firstName} ${employee.lastName}`, code: employee.employeeCode, subject: title }, ip: getClientIp(req) })

  return apiOk(notif, 'Notificación enviada.')
})
