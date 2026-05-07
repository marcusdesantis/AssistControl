import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, country: true } })
  console.log('TENANTS:', JSON.stringify(tenants, null, 2))

  const redmi = tenants.find(t => t.name.toLowerCase().includes('redmi'))
  if (!redmi) { console.log('No se encontró tenant Redmi'); return }

  const schedules = await prisma.schedule.findMany({
    where: { tenantId: redmi.id },
    select: { id: true, name: true, type: true },
  })
  console.log('SCHEDULES:', JSON.stringify(schedules, null, 2))

  const holidays = await prisma.holiday.findMany({
    where: { tenantId: redmi.id, isDeleted: false, date: { lte: '2026-05-07' } },
    select: { date: true, name: true },
    orderBy: { date: 'desc' },
    take: 15,
  })
  console.log('HOLIDAYS (pasados):', JSON.stringify(holidays, null, 2))

  const depts = await prisma.department.findMany({
    where: { tenantId: redmi.id },
    select: { id: true, name: true },
  })
  console.log('DEPARTMENTS:', JSON.stringify(depts, null, 2))
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect() })
