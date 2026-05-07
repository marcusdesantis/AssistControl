import { prisma } from '@attendance/shared'

export async function getAll(tenantId: string, year: number) {
  const from = `${year}-01-01`
  const to   = `${year}-12-31`
  return prisma.holiday.findMany({
    where:   { tenantId, isDeleted: false, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
    select:  { id: true, date: true, name: true, localName: true, description: true, createdAt: true },
  })
}

export async function create(tenantId: string, dto: { date: string; name: string; description?: string | null }) {
  const existing = await prisma.holiday.findFirst({ where: { tenantId, date: dto.date } })
  if (existing && !existing.isDeleted)
    throw { code: 'DUPLICATE_DATE', message: 'Ya existe un día inhábil en esa fecha.' }
  if (existing?.isDeleted) {
    return prisma.holiday.update({
      where:  { id: existing.id },
      data:   { name: dto.name.trim(), description: dto.description?.trim() ?? null, localName: null, isDeleted: false },
      select: { id: true, date: true, name: true, localName: true, description: true, createdAt: true },
    })
  }
  return prisma.holiday.create({
    data:   { tenantId, date: dto.date, name: dto.name.trim(), description: dto.description?.trim() ?? null },
    select: { id: true, date: true, name: true, localName: true, description: true, createdAt: true },
  })
}

export async function update(id: string, tenantId: string, dto: { date: string; name: string; description?: string | null }) {
  const h = await prisma.holiday.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!h) throw { code: 'NOT_FOUND', message: 'Día inhábil no encontrado.' }
  const dup = await prisma.holiday.findFirst({ where: { tenantId, date: dto.date, isDeleted: false, NOT: { id } } })
  if (dup) throw { code: 'DUPLICATE_DATE', message: 'Ya existe un día inhábil en esa fecha.' }
  return prisma.holiday.update({
    where:  { id },
    data:   { date: dto.date, name: dto.name.trim(), description: dto.description?.trim() ?? null },
    select: { id: true, date: true, name: true, localName: true, description: true, createdAt: true },
  })
}

export async function remove(id: string, tenantId: string) {
  const h = await prisma.holiday.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!h) throw { code: 'NOT_FOUND', message: 'Día inhábil no encontrado.' }
  await prisma.holiday.update({ where: { id }, data: { isDeleted: true } })
}

export async function generate(tenantId: string, year: number) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const countryCode = (tenant?.country ?? 'EC').toUpperCase()

  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`)
  if (!res.ok) throw { code: 'API_ERROR', message: `No se pudieron obtener los feriados para el país "${countryCode}". Verifica el código de país en la configuración de tu empresa.` }

  const list = await res.json() as { date: string; name: string; localName: string }[]
  if (!Array.isArray(list)) throw { code: 'API_ERROR', message: 'Respuesta inesperada de la API de feriados.' }

  let added = 0, replaced = 0
  for (const h of list) {
    const name      = h.localName || h.name
    const localName = h.localName ?? null
    const existing  = await prisma.holiday.findFirst({ where: { tenantId, date: h.date } })
    if (!existing) {
      await prisma.holiday.create({
        data: { tenantId, date: h.date, name, localName, description: null },
      })
      added++
    } else {
      await prisma.holiday.update({
        where: { id: existing.id },
        data:  { name, localName, isDeleted: false },
      })
      if (existing.isDeleted) added++
      else replaced++
    }
  }
  return { added, replaced, total: list.length }
}
