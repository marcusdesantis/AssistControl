import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const schema = z.object({
  subject: z.string().min(1),
  body:    z.string().min(1),
  target:  z.enum(['admin', 'company']).default('admin'),
})

async function getSystemSmtp() {
  const s = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  if (!s?.smtpEnabled || !s.smtpHost || !s.smtpUsername || !s.smtpPassword)
    throw { code: 'SMTP_NOT_CONFIGURED', message: 'El SMTP del sistema no está configurado. Configúralo en Ajustes.' }
  return s
}

export const POST = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { subject, body, target } = schema.parse(await req.json())

  const [tenant, smtp] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id },
      include: { users: { where: { role: 'Admin', isActive: true, isDeleted: false }, select: { email: true }, take: 1 } },
    }),
    getSystemSmtp(),
  ])

  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  const recipientEmail = target === 'company' ? tenant.email : tenant.users[0]?.email
  if (!recipientEmail) throw {
    code: 'NO_EMAIL',
    message: target === 'company'
      ? 'La empresa no tiene un correo de contacto configurado.'
      : 'La empresa no tiene un administrador con correo.',
  }

  const secure = smtp.smtpPort === 465
  const transporter = nodemailer.createTransport({
    host: smtp.smtpHost!, port: smtp.smtpPort, secure,
    auth: { user: smtp.smtpUsername!, pass: smtp.smtpPassword! },
  })

  await transporter.sendMail({
    from:    `"${smtp.smtpFromName ?? 'TiempoYa'}" <${smtp.smtpUsername}>`,
    to:      recipientEmail,
    subject,
    html:    body.replace(/\n/g, '<br>'),
  })

  return apiOk({ to: recipientEmail }, 'Correo enviado correctamente.')
})
