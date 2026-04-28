import { prisma, sendSystemEmail } from '@attendance/shared'

export async function getTickets(tenantId: string) {
  return prisma.supportTicket.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, subject: true, category: true,
      status: true, priority: true,
      createdAt: true, updatedAt: true, resolvedAt: true,
      _count: { select: { messages: true } },
    },
  })
}

export async function createTicket(tenantId: string, data: {
  subject: string
  description: string
  category: string
}) {
  const [ticket, tenant] = await Promise.all([
    prisma.supportTicket.create({
      data: { tenantId, ...data },
      include: { _count: { select: { messages: true } } },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])

  await prisma.notification.create({
    data: {
      forAdmin: true,
      title: 'Nuevo ticket de soporte',
      body:  `${tenant?.name ?? 'Una empresa'} abrió un ticket: "${data.subject}"`,
      type:  'info',
    },
  })

  sendSystemEmail({
    subject: `Nuevo ticket de soporte: ${data.subject}`,
    html: `
      <p>La empresa <strong>${tenant?.name ?? tenantId}</strong> ha abierto un nuevo ticket de soporte.</p>
      <p><strong>Asunto:</strong> ${data.subject}</p>
      <p><strong>Categoría:</strong> ${data.category}</p>
      <p><strong>Descripción:</strong></p>
      <p style="white-space:pre-wrap">${data.description}</p>
    `,
  }).catch(() => { /* silencioso si SMTP no configurado */ })

  return ticket
}

export async function getTicket(tenantId: string, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, tenantId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) throw { code: 'NOT_FOUND', message: 'Ticket no encontrado.' }
  return ticket
}

export async function addMessage(tenantId: string, ticketId: string, body: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, tenantId },
  })
  if (!ticket) throw { code: 'NOT_FOUND', message: 'Ticket no encontrado.' }
  if (ticket.status === 'closed') throw { code: 'TICKET_CLOSED', message: 'El ticket está cerrado.' }

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId, body, authorType: 'tenant' },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'open', updatedAt: new Date() },
    }),
  ])

  await prisma.notification.create({
    data: {
      forAdmin: true,
      title: 'Nueva respuesta en ticket de soporte',
      body:  `Una empresa respondió en el ticket: "${ticket.subject}"`,
      type:  'info',
    },
  })

  return message
}

export async function getSupportInfo() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
    select: { supportWhatsapp: true, supportEmail: true },
  })
  return {
    whatsapp: settings?.supportWhatsapp ?? null,
    email:    settings?.supportEmail    ?? null,
  }
}
