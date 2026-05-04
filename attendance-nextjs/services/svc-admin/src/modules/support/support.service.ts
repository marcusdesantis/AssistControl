import { prisma } from '@attendance/shared'

export async function adminGetTickets(filters: {
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  page: number
  pageSize: number
}) {
  const where: Record<string, unknown> = {}
  if (filters.status)   where.status   = filters.status
  if (filters.priority) where.priority = filters.priority
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo   ? { lte: new Date(filters.dateTo + 'T23:59:59.999Z') } : {}),
    }
  }

  const [total, items] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true, tenantId: true, subject: true, category: true,
        status: true, priority: true,
        createdAt: true, updatedAt: true, resolvedAt: true,
        _count: { select: { messages: true } },
        tenant: { select: { name: true } },
      },
    }),
  ])
  return { total, page: filters.page, pageSize: filters.pageSize, items }
}

export async function adminGetTicket(id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      tenant:   { select: { name: true } },
    },
  })
  if (!ticket) throw { code: 'NOT_FOUND', message: 'Ticket no encontrado.' }
  return ticket
}

export async function adminUpdateTicket(id: string, data: { status?: string; priority?: string }) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id } })
  if (!ticket) throw { code: 'NOT_FOUND', message: 'Ticket no encontrado.' }

  const updateData: Record<string, unknown> = { ...data }
  if (data.status === 'closed' && ticket.status !== 'closed') {
    updateData.resolvedAt = new Date()
  }
  return prisma.supportTicket.update({ where: { id }, data: updateData })
}

export async function adminAddMessage(ticketId: string, body: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId } })
  if (!ticket) throw { code: 'NOT_FOUND', message: 'Ticket no encontrado.' }

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId, body, authorType: 'admin' },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'pending', updatedAt: new Date() },
    }),
  ])

  await prisma.notification.create({
    data: {
      tenantId: ticket.tenantId,
      forAdmin: false,
      title: 'Respuesta de soporte',
      body:  `El equipo de soporte respondió tu ticket: "${ticket.subject}"`,
      type:  'info',
    },
  })

  return message
}
