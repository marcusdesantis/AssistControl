import nodemailer from 'nodemailer'
import QRCode from 'qrcode'
import prisma from '../prisma'

interface SendOptions {
  to:      string | string[]
  subject: string
  html:    string
}

async function getSmtpConfig(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant?.smtpEnabled || !tenant.smtpHost || !tenant.smtpUsername || !tenant.smtpPassword)
    return null
  // Port 465 = implicit SSL/TLS; any other port (587, 25) = STARTTLS
  const secure = tenant.smtpPort === 465
  return {
    host:     tenant.smtpHost,
    port:     tenant.smtpPort,
    secure,
    user:     tenant.smtpUsername,
    password: tenant.smtpPassword,
    fromName: tenant.smtpFromName ?? tenant.name,
  }
}

async function getSystemSmtpConfig() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  if (!settings?.smtpEnabled || !settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword)
    return null
  const secure = settings.smtpPort === 465
  return {
    host:        settings.smtpHost,
    port:        settings.smtpPort,
    secure,
    user:        settings.smtpUsername,
    password:    settings.smtpPassword,
    fromName:    settings.smtpFromName ?? 'Sistema',
    fromEmail:   settings.smtpFromEmail ?? settings.smtpUsername,
    supportEmail: settings.supportEmail ?? null,
  }
}

interface SystemEmailOptions {
  subject: string
  html:    string
  to?:     string | string[]
}

/** Sends an email using the system-level SMTP (SystemSettings). Throws if not configured. */
export async function sendSystemEmail(opts: SystemEmailOptions): Promise<void> {
  const config = await getSystemSmtpConfig()
  if (!config) throw { code: 'SMTP_NOT_CONFIGURED', message: 'SMTP del sistema no configurado.' }

  const to: string | string[] | null = opts.to ?? config.supportEmail
  if (!to || (Array.isArray(to) && to.length === 0))
    throw { code: 'NO_RECIPIENT', message: 'No hay destinatario configurado.' }

  const transporter = nodemailer.createTransport({
    host:   config.host,
    port:   config.port,
    secure: config.secure,
    auth:   { user: config.user, pass: config.password },
  })

  await transporter.sendMail({
    from:    `"${config.fromName}" <${config.fromEmail}>`,
    to:      Array.isArray(to) ? to.join(',') : to,
    subject: opts.subject,
    html:    opts.html,
  })
}

export async function generateQr(text: string, size = 200): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' })
}

export async function sendEmail(tenantId: string, opts: SendOptions): Promise<void> {
  const config = await getSmtpConfig(tenantId)
  if (!config) throw { code: 'SMTP_NOT_CONFIGURED', message: 'SMTP no configurado para este tenant.' }

  const transporter = nodemailer.createTransport({
    host:   config.host,
    port:   config.port,
    secure: config.secure,
    auth:   { user: config.user, pass: config.password },
  })

  try {
    await transporter.sendMail({
      from:    `"${config.fromName}" <${config.user}>`,
      to:      Array.isArray(opts.to) ? opts.to.join(',') : opts.to,
      subject: opts.subject,
      html:    opts.html,
    })
  } catch (err: any) {
    const hint = err.code === 'ESOCKET'   ? ' (verifica el puerto y SSL/TLS en la configuración SMTP)' :
                 err.code === 'EAUTH'     ? ' (usuario o contraseña incorrectos)' :
                 err.code === 'EENVELOPE' ? ' (dirección de destinatario inválida)' : ''
    throw { code: 'SMTP_SEND_ERROR', message: `Error al enviar el correo: ${err.message ?? err.code}${hint}` }
  }
}
