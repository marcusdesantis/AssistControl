import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const schedules = await prisma.schedule.findMany({
    where: { tenantId: 'a8d467f6-9271-4bb2-9548-dae7f65e890d' },
  })
  for (const s of schedules) {
    console.log(`\n=== ${s.name} (${s.type}) ===`)
    console.log(JSON.stringify(s.days, null, 2))
  }
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect() })
