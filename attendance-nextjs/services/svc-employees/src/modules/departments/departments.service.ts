import { prisma, checkPlanLimit } from '@attendance/shared'

const COUNT_EMPLOYEES = { _count: { select: { employees: { where: { isDeleted: false } } } } }

function toDto(d: any) {
  const { _count, ...rest } = d
  return { ...rest, employeeCount: _count?.employees ?? 0 }
}

export async function getAll(tenantId: string, page = 1, pageSize = 10, search?: string) {
  const where = {
    tenantId,
    isDeleted: false,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.department.findMany({ where, include: COUNT_EMPLOYEES, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.department.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

export async function create(tenantId: string, name: string, description?: string | null) {
  const count = await prisma.department.count({ where: { tenantId, isDeleted: false } })
  await checkPlanLimit(tenantId, 'organization', count, 'departamentos')

  const exists = await prisma.department.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' }, isDeleted: false },
  })
  if (exists) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un departamento con ese nombre.' }
  return prisma.department.create({ data: { tenantId, name: name.trim(), description: description ?? null } })
}

export async function update(id: string, tenantId: string, name: string, description?: string | null) {
  const dept = await prisma.department.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!dept) throw { code: 'NOT_FOUND', message: 'Departamento no encontrado.' }

  const dup = await prisma.department.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' }, isDeleted: false, NOT: { id } },
  })
  if (dup) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un departamento con ese nombre.' }

  return prisma.department.update({ where: { id }, data: { name: name.trim(), description: description ?? null } })
}

export async function remove(id: string, tenantId: string, reassignToId?: string) {
  const dept = await prisma.department.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!dept) throw { code: 'NOT_FOUND', message: 'Departamento no encontrado.' }

  await prisma.employee.updateMany({
    where: { tenantId, departmentId: id, isDeleted: false },
    data:  { departmentId: reassignToId ?? null },
  })
  await prisma.department.update({ where: { id }, data: { isDeleted: true } })
}
