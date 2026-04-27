import { prisma } from '@attendance/shared'

function toDto(m: any) {
  return {
    id:           m.id,
    employeeId:   m.employeeId,
    employeeName: m.employee ? `${m.employee.firstName} ${m.employee.lastName}` : '',
    senderName:   m.senderName,
    subject:      m.subject,
    body:         m.body,
    isRead:       m.isRead,
    allowDelete:  m.allowDelete,
    createdAt:    m.createdAt,
  }
}

const INCLUDE_EMP = { employee: { select: { firstName: true, lastName: true } } }

export async function getAll(tenantId: string, page = 1, pageSize = 20, employeeId?: string) {
  const where: any = { tenantId, isDeleted: false }
  if (employeeId) where.employeeId = employeeId
  const [items, total] = await Promise.all([
    prisma.employeeMessage.findMany({ where, include: INCLUDE_EMP, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.employeeMessage.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

export async function getByEmployee(employeeId: string, tenantId: string, page = 1, pageSize = 20) {
  const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId, isDeleted: false } })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const where = { employeeId, tenantId, isDeleted: false }
  const [items, total] = await Promise.all([
    prisma.employeeMessage.findMany({ where, include: INCLUDE_EMP, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.employeeMessage.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

export async function send(
  tenantId: string,
  data: { forAll: boolean; employeeIds: string[]; senderName: string; subject: string; body: string; allowDelete: boolean },
) {
  let targetIds: string[]
  if (data.forAll) {
    const emps = await prisma.employee.findMany({ where: { tenantId, isDeleted: false, status: 'Active' }, select: { id: true } })
    targetIds  = emps.map(e => e.id)
  } else {
    targetIds = data.employeeIds
  }
  if (targetIds.length === 0) throw { code: 'NO_TARGETS', message: 'No hay empleados destino.' }

  await prisma.employeeMessage.createMany({
    data: targetIds.map(empId => ({
      tenantId, employeeId: empId,
      senderName: data.senderName, subject: data.subject, body: data.body, allowDelete: data.allowDelete,
    })),
  })
  return targetIds.length  // .NET returns the count directly (not wrapped)
}

export async function markRead(id: string, tenantId: string) {
  const msg = await prisma.employeeMessage.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  await prisma.employeeMessage.update({ where: { id }, data: { isRead: true } })
}

export async function updateAllowDelete(id: string, tenantId: string, allowDelete: boolean) {
  const msg = await prisma.employeeMessage.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  await prisma.employeeMessage.update({ where: { id }, data: { allowDelete } })
}

export async function remove(id: string, tenantId: string) {
  const msg = await prisma.employeeMessage.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  await prisma.employeeMessage.update({ where: { id }, data: { isDeleted: true } })
}
