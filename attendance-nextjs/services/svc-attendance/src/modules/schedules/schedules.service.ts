import { prisma, checkPlanLimit } from '@attendance/shared'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScheduleDayInput {
  day:              number
  isWorkDay:        boolean
  entryTime?:       string | null
  exitTime?:        string | null
  hasLunch:         boolean
  lunchStart?:      string | null
  lunchEnd?:        string | null
  requiredMinutes?: number | null
}

interface ScheduleUpsertDto {
  name:                 string
  type:                 string          // 'Fixed' | 'Variable' | 'Rotativo'
  lateToleranceMinutes: number
  requiredHoursPerDay?: number | null
  // Fixed / Variable: array plano de 7 días
  // Rotativo: array de semanas, cada semana con 7 días
  days:                 ScheduleDayInput[] | ScheduleDayInput[][]
  rotationWeeks?:       number | null   // 2, 3 o 4 — solo Rotativo
  rotationStartDate?:   string | null   // ISO date — solo Rotativo
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  Fixed:    'Fijo',
  Variable: 'Variable',
  Rotativo: 'Rotativo',
}

const DAY_LABEL: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves',  5: 'Viernes', 6: 'Sábado',
}

const COUNT_INCLUDE = { _count: { select: { employees: { where: { isDeleted: false } } } } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapDay(d: ScheduleDayInput) {
  return {
    day:             d.day,
    isWorkDay:       d.isWorkDay,
    entryTime:       d.entryTime  ?? null,
    exitTime:        d.exitTime   ?? null,
    hasLunch:        d.hasLunch,
    lunchStart:      d.hasLunch ? (d.lunchStart ?? null) : null,
    lunchEnd:        d.hasLunch ? (d.lunchEnd   ?? null) : null,
    requiredMinutes: d.requiredMinutes ?? null,
  }
}

function buildDays(dto: ScheduleUpsertDto) {
  if (dto.type === 'Rotativo') {
    // Array de semanas
    const weeks = dto.days as ScheduleDayInput[][]
    return weeks.map(week => week.map(mapDay))
  }
  // Fixed o Variable: array plano
  return (dto.days as ScheduleDayInput[]).map(mapDay)
}

function mapDayDto(d: any) {
  return {
    day:             d.day,
    dayLabel:        DAY_LABEL[d.day] ?? String(d.day),
    isWorkDay:       d.isWorkDay,
    entryTime:       d.entryTime  ?? null,
    exitTime:        d.exitTime   ?? null,
    hasLunch:        d.hasLunch,
    lunchStart:      d.lunchStart ?? null,
    lunchEnd:        d.lunchEnd   ?? null,
    requiredMinutes: d.requiredMinutes ?? null,
  }
}

function toDto(s: any) {
  // Para Rotativo, days es array de semanas
  let days: any
  if (s.type === 'Rotativo') {
    const weeks = Array.isArray(s.days) ? s.days : []
    days = weeks.map((week: any[]) =>
      Array.isArray(week) ? week.map(mapDayDto) : []
    )
  } else {
    days = (Array.isArray(s.days) ? s.days : []).map(mapDayDto)
  }

  return {
    id:                   s.id,
    name:                 s.name,
    type:                 s.type,
    typeLabel:            TYPE_LABEL[s.type] ?? s.type,
    lateToleranceMinutes: s.lateToleranceMinutes,
    requiredHoursPerDay:  s.requiredHoursPerDay ?? null,
    rotationWeeks:        s.rotationWeeks       ?? null,
    rotationStartDate:    s.rotationStartDate   ?? null,
    days,
    employeeCount:        s._count?.employees ?? 0,
    tenantId:             s.tenantId,
    createdAt:            s.createdAt,
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAll(tenantId: string) {
  const items = await prisma.schedule.findMany({
    where:   { tenantId, isDeleted: false },
    include: COUNT_INCLUDE,
    orderBy: { createdAt: 'asc' },
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
      requiredHoursPerDay:  dto.requiredHoursPerDay  ?? null,
      days:                 buildDays(dto) as any,
      rotationWeeks:        dto.type === 'Rotativo' ? (dto.rotationWeeks ?? null)    : null,
      rotationStartDate:    dto.type === 'Rotativo' ? (dto.rotationStartDate ? new Date(dto.rotationStartDate) : null) : null,
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
      requiredHoursPerDay:  dto.requiredHoursPerDay  ?? null,
      days:                 buildDays(dto) as any,
      rotationWeeks:        dto.type === 'Rotativo' ? (dto.rotationWeeks ?? null)    : null,
      rotationStartDate:    dto.type === 'Rotativo' ? (dto.rotationStartDate ? new Date(dto.rotationStartDate) : null) : null,
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
