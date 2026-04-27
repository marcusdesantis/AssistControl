import { prisma, checkPlanLimit } from '@attendance/shared'

interface ScheduleDayInput {
  day:        number
  isWorkDay:  boolean
  entryTime?:  string | null
  exitTime?:   string | null
  hasLunch:   boolean
  lunchStart?: string | null
  lunchEnd?:   string | null
}

interface ScheduleUpsertDto {
  name:                 string
  type:                 string
  lateToleranceMinutes: number
  requiredHoursPerDay?: number | null
  days:                 ScheduleDayInput[]
}

const TYPE_LABEL: Record<string, string> = { Fixed: 'Fijo', Flexible: 'Flexible', Shift: 'Turnos' }
const DAY_LABEL:  Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves',  5: 'Viernes', 6: 'Sábado',
}

function toDto(s: any) {
  const days = (Array.isArray(s.days) ? s.days : []).map((d: any) => ({
    day:        d.day,
    dayLabel:   DAY_LABEL[d.day] ?? String(d.day),
    isWorkDay:  d.isWorkDay,
    entryTime:  d.entryTime,
    exitTime:   d.exitTime,
    hasLunch:   d.hasLunch,
    lunchStart: d.lunchStart ?? null,
    lunchEnd:   d.lunchEnd   ?? null,
  }))
  return {
    id:                   s.id,
    name:                 s.name,
    type:                 s.type,
    typeLabel:            TYPE_LABEL[s.type] ?? s.type,
    lateToleranceMinutes: s.lateToleranceMinutes,
    requiredHoursPerDay:  s.requiredHoursPerDay ?? null,
    days,
    employeeCount:        s._count?.employees ?? 0,
    tenantId:             s.tenantId,
    createdAt:            s.createdAt,
  }
}

const COUNT_INCLUDE = { _count: { select: { employees: { where: { isDeleted: false } } } } }

function buildDays(dto: ScheduleUpsertDto) {
  return dto.days.map(d => ({
    day:        d.day,
    isWorkDay:  d.isWorkDay,
    entryTime:  d.entryTime,
    exitTime:   d.exitTime,
    hasLunch:   d.hasLunch,
    lunchStart: d.hasLunch ? (d.lunchStart ?? null) : null,
    lunchEnd:   d.hasLunch ? (d.lunchEnd   ?? null) : null,
  }))
}

export async function getAll(tenantId: string) {
  const items = await prisma.schedule.findMany({
    where:   { tenantId, isDeleted: false },
    include: COUNT_INCLUDE,
    orderBy: { name: 'asc' },
  })
  return items.map(toDto)
}

export async function getById(id: string, tenantId: string) {
  const s = await prisma.schedule.findFirst({
    where:   { id, tenantId, isDeleted: false },
    include: COUNT_INCLUDE,
  })
  if (!s) throw { code: 'NOT_FOUND', message: 'Horario no encontrado.' }
  return toDto(s)
}

export async function create(tenantId: string, dto: ScheduleUpsertDto) {
  const count = await prisma.schedule.count({ where: { tenantId, isDeleted: false } })
  await checkPlanLimit(tenantId, 'schedules', count, 'horarios')

  const exists = await prisma.schedule.findFirst({
    where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, isDeleted: false },
  })
  if (exists) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un horario con ese nombre.' }

  const s = await prisma.schedule.create({
    data: {
      tenantId,
      name:                 dto.name.trim(),
      type:                 dto.type as any,
      lateToleranceMinutes: dto.lateToleranceMinutes,
      requiredHoursPerDay:  dto.requiredHoursPerDay ?? null,
      days:                 buildDays(dto) as any,
    },
    include: COUNT_INCLUDE,
  })
  return toDto(s)
}

export async function update(id: string, tenantId: string, dto: ScheduleUpsertDto) {
  const sched = await prisma.schedule.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!sched) throw { code: 'NOT_FOUND', message: 'Horario no encontrado.' }

  const dup = await prisma.schedule.findFirst({
    where: { tenantId, name: { equals: dto.name, mode: 'insensitive' }, isDeleted: false, NOT: { id } },
  })
  if (dup) throw { code: 'DUPLICATE_NAME', message: 'Ya existe un horario con ese nombre.' }

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      name:                 dto.name.trim(),
      type:                 dto.type as any,
      lateToleranceMinutes: dto.lateToleranceMinutes,
      requiredHoursPerDay:  dto.requiredHoursPerDay ?? null,
      days:                 buildDays(dto) as any,
    },
    include: COUNT_INCLUDE,
  })
  return toDto(updated)
}

export async function remove(id: string, tenantId: string, reassignToId?: string) {
  const sched = await prisma.schedule.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!sched) throw { code: 'NOT_FOUND', message: 'Horario no encontrado.' }

  if (reassignToId) {
    const target = await prisma.schedule.findFirst({ where: { id: reassignToId, tenantId, isDeleted: false } })
    if (!target) throw { code: 'REASSIGN_NOT_FOUND', message: 'El horario de reasignación no existe.' }
    await prisma.employee.updateMany({
      where: { tenantId, scheduleId: id, isDeleted: false },
      data:  { scheduleId: reassignToId },
    })
  } else {
    await prisma.employee.updateMany({
      where: { tenantId, scheduleId: id, isDeleted: false },
      data:  { scheduleId: null },
    })
  }
  await prisma.schedule.update({ where: { id }, data: { isDeleted: true } })
}
