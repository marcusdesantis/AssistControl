import { prisma, checkPlanLimit } from '@attendance/shared'

const COUNT_EMPLOYEES = { _count: { select: { employees: { where: { isDeleted: false } } } } }

function toDto(p: any) {
  const { _count, ...rest } = p
  return { ...rest, employeeCount: _count?.employees ?? 0 }
}

export async function getAll(tenantId: string, page = 1, pageSize = 10, search?: string) {
  const where = {
    tenantId,
    isDeleted: false,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.position.findMany({ where, include: COUNT_EMPLOYEES, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.position.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

export async function create(tenantId: string, name: string, description?: string | null) {
  const count = await prisma.position.count({ where: { tenantId, isDeleted: false } })
  await checkPlanLimit(tenantId, 'organization', count, 'cargos')

  const exists = await prisma.position.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' }, isDeleted: false },
  })
  if (exists) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un cargo con ese nombre.' }
  return prisma.position.create({ data: { tenantId, name: name.trim(), description: description ?? null } })
}

export async function update(id: string, tenantId: string, name: string, description?: string | null) {
  const pos = await prisma.position.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!pos) throw { code: 'NOT_FOUND', message: 'Cargo no encontrado.' }

  const dup = await prisma.position.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' }, isDeleted: false, NOT: { id } },
  })
  if (dup) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un cargo con ese nombre.' }

  return prisma.position.update({ where: { id }, data: { name: name.trim(), description: description ?? null } })
}

export async function remove(id: string, tenantId: string, reassignToId?: string) {
  const pos = await prisma.position.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!pos) throw { code: 'NOT_FOUND', message: 'Cargo no encontrado.' }

  await prisma.employee.updateMany({
    where: { tenantId, positionId: id, isDeleted: false },
    data:  { positionId: reassignToId ?? null },
  })
  await prisma.position.update({ where: { id }, data: { isDeleted: true } })
}
