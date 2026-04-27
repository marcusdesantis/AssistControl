import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const schema = z.object({
  tenantIds: z.array(z.string().uuid()).min(1),
  action:    z.enum(['notify', 'email']),
  title:     z.string().min(1).optional(),
  subject:   z.string().min(1).optional(),
  body:      z.string().min(1),
  type:      z.enum(['info', 'success', 'warning', 'error']).default('info'),
  target:    z.enum(['admin', 'company']).default('admin'),
})

async function getSystemSmtp() {
  const s = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  if (!s?.smtpEnabled || !s.smtpHost || !s.smtpUsername || !s.smtpPassword)
    throw { code: 'SMTP_NOT_CONFIGURED', message: 'El SMTP del sistema no está configurado.' }
  return s
}

export const POST = withSuperadmin(async (req) => {
  const { tenantIds, action, title, subject, body, type, target } = schema.parse(await req.json())

  if (action === 'notify') {
    if (!title) throw { code: 'BAD_REQUEST', message: 'El título es requerido.' }
    await prisma.notification.createMany({
      data: tenantIds.map(tenantId => ({ tenantId, forAdmin: false, title, body, type })),
    })
    return apiOk({ sent: tenantIds.length }, `Notificación enviada a ${tenantIds.length} empresa(s).`)
  }

  // email
  if (!subject) throw { code: 'BAD_REQUEST', message: 'El asunto es requerido.' }
  const smtp = await getSystemSmtp()

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    include: { users: { where: { role: 'Admin', isActive: true, isDeleted: false }, select: { email: true }, take: 1 } },
  })

  const emails = tenants
    .map(t => target === 'company' ? t.email : t.users[0]?.email)
    .filter((e): e is string => !!e)
  if (emails.length === 0) throw { code: 'NO_EMAILS', message: 'Ninguna empresa tiene un administrador con email.' }

  const secure = smtp.smtpPort === 465
  const transporter = nodemailer.createTransport({
    host: smtp.smtpHost!, port: smtp.smtpPort, secure,
    auth: { user: smtp.smtpUsername!, pass: smtp.smtpPassword! },
  })

  await transporter.sendMail({
    from:    `"${smtp.smtpFromName ?? 'AssistControl'}" <${smtp.smtpUsername}>`,
    to:      emails.join(', '),
    subject,
    html:    body.replace(/\n/g, '<br>'),
  })

  return apiOk({ sent: emails.length }, `Correo enviado a ${emails.length} empresa(s).`)
})
