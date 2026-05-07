/**
 * Seed de empleados y registros de prueba para tenant Redmi
 * Cubre todos los casos de overtime: Noct.25%, Supl.50%, SupNoc.100%, Extrao.100%
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TENANT_ID    = 'a8d467f6-9271-4bb2-9548-dae7f65e890d'
const DEPT_ID      = '286af7ae-ab6a-475b-bb65-0acccffcea08'
const SCH_STANDARD = '91a763e8-f8a5-4037-a7f0-cddb791a86e2'  // 07:00-16:00 Lun-Vie
const SCH_TARDE    = '3587d036-ca86-4658-a50a-f476eb987f70'  // 19:00-23:00 Lun-Vie (todo nocturno)
const SCH_VARIABLE = '569192ea-b53a-4cb5-91f5-91cefc433b6b'  // 240 min req/día
const SCH_ROTATIVO = '316a6b03-a979-4555-9897-129fa1a45b5d'  // 3 semanas rotando

// Ecuador = UTC-5 → new Date con offset -05:00
function ec(localDate: string, localTime: string): Date {
  return new Date(`${localDate}T${localTime}:00-05:00`)
}

const hash = (s: string) => bcrypt.hashSync(s, 10)
const PASSWORD = 'Test1234!'
const PIN      = '1234'

// Helper: asigna employeeId a un lote de registros
function forEmp(id: string, recs: object[]) {
  return recs.map((r: any) => ({ ...r, employeeId: id }))
}

async function main() {
  console.log('🌱 Iniciando seed de prueba para Redmi...\n')

  // ── Empleados ──────────────────────────────────────────────────────────────
  const employees = [
    { code: 'TST-001', firstName: 'Carlos',  lastName: 'Morales',  scheduleId: SCH_STANDARD },
    { code: 'TST-002', firstName: 'Ana',     lastName: 'Torres',   scheduleId: SCH_STANDARD },
    { code: 'TST-003', firstName: 'Luis',    lastName: 'Peña',     scheduleId: SCH_STANDARD },
    { code: 'TST-004', firstName: 'Carmen',  lastName: 'Vélez',    scheduleId: SCH_STANDARD },
    { code: 'TST-005', firstName: 'Pedro',   lastName: 'Jiménez',  scheduleId: SCH_TARDE    },
    { code: 'TST-006', firstName: 'María',   lastName: 'López',    scheduleId: SCH_TARDE    },
    { code: 'TST-007', firstName: 'Sofía',   lastName: 'Castro',   scheduleId: SCH_VARIABLE },
    { code: 'TST-008', firstName: 'Roberto', lastName: 'Aguirre',  scheduleId: SCH_VARIABLE },
    { code: 'TST-009', firstName: 'Diana',   lastName: 'Flores',   scheduleId: SCH_ROTATIVO },
    { code: 'TST-010', firstName: 'Jorge',   lastName: 'Ramírez',  scheduleId: SCH_ROTATIVO },
  ]

  const empIds: Record<string, string> = {}
  for (const e of employees) {
    const username = e.code.toLowerCase().replace(/-/g, '')
    // Intenta crear; si ya existe, solo obtiene el id
    let emp = await prisma.employee.findFirst({
      where: { tenantId: TENANT_ID, employeeCode: e.code, isDeleted: false },
    })
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          tenantId:          TENANT_ID,
          employeeCode:      e.code,
          firstName:         e.firstName,
          lastName:          e.lastName,
          email:             `${username}@redmi.test`,
          username,
          passwordHash:      hash(PASSWORD),
          passwordDisplay:   PASSWORD,
          pinHash:           hash(PIN),
          pinDisplay:        PIN,
          status:            'Active',
          departmentId:      DEPT_ID,
          scheduleId:        e.scheduleId,
          scheduleStartDate: new Date('2026-04-06T05:00:00.000Z'),
          worksOnHolidays:   true,
          hireDate:          '2025-01-01',
        },
      })
    }
    empIds[e.code] = emp.id
    console.log(`✅ ${e.firstName} ${e.lastName} (${e.code}) → ${emp.id}`)
  }

  // Elimina registros previos de estos empleados
  await prisma.attendanceRecord.deleteMany({
    where: { tenantId: TENANT_ID, employeeId: { in: Object.values(empIds) } },
  })
  console.log('\n🗑️  Registros anteriores eliminados.\n')

  // ── Registros de asistencia ────────────────────────────────────────────────
  const allRecords: any[] = [

    // TST-001 Carlos Morales — Estándar (07:00-16:00) · Supl 50% + Extrao sábado
    ...forEmp(empIds['TST-001'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','16:00'), status:'Present' },
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-28','18:30'), status:'Present' }, // Supl 50% = 2h30m
      { date:'2026-04-29', checkIn:ec('2026-04-29','07:00'), checkOut:ec('2026-04-29','20:00'), status:'Present' }, // Supl 50% = 4h
      { date:'2026-04-30', checkIn:ec('2026-04-30','07:00'), checkOut:ec('2026-04-30','16:00'), status:'Present' },
      { date:'2026-05-02', checkIn:ec('2026-05-02','08:00'), checkOut:ec('2026-05-02','12:00'), status:'Present' }, // Sábado Extrao 100% = 4h
      { date:'2026-05-04', checkIn:ec('2026-05-04','07:00'), checkOut:ec('2026-05-04','16:00'), status:'Present' },
      { date:'2026-05-05', checkIn:ec('2026-05-05','07:00'), checkOut:ec('2026-05-05','19:00'), status:'Present' }, // Supl 50% = 3h
    ]),

    // TST-002 Ana Torres — Estándar · Supl nocturna 100% + Feriado + Domingo
    ...forEmp(empIds['TST-002'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','22:00'), status:'Present' }, // Supl 50% = 6h
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-29','01:30'), status:'Present' }, // Supl 50% = 8h + SupNoc 100% = 1h30m
      { date:'2026-04-29', checkIn:ec('2026-04-29','07:00'), checkOut:ec('2026-04-29','16:00'), status:'Present' },
      { date:'2026-05-01', checkIn:ec('2026-05-01','08:00'), checkOut:ec('2026-05-01','17:00'), status:'Present' }, // Feriado Extrao 100% = 9h
      { date:'2026-05-03', checkIn:ec('2026-05-03','09:00'), checkOut:ec('2026-05-03','14:00'), status:'Present' }, // Domingo Extrao 100% = 5h
      { date:'2026-05-04', checkIn:ec('2026-05-04','07:00'), checkOut:ec('2026-05-04','16:00'), status:'Present' },
    ]),

    // TST-003 Luis Peña — Estándar · Cruce medianoche + Festivo
    ...forEmp(empIds['TST-003'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','16:00'), status:'Present' },
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-28','19:00'), status:'Present' }, // Supl 50% = 3h
      { date:'2026-04-29', checkIn:ec('2026-04-29','07:00'), checkOut:ec('2026-04-30','01:00'), status:'Present' }, // Supl 50% = 8h + SupNoc 100% = 1h
      { date:'2026-04-30', checkIn:ec('2026-04-30','07:00'), checkOut:ec('2026-04-30','16:00'), status:'Present' },
      { date:'2026-05-02', checkIn:ec('2026-05-02','09:00'), checkOut:ec('2026-05-02','15:00'), status:'Present' }, // Sábado Extrao 100% = 6h
      { date:'2026-05-04', checkIn:ec('2026-05-04','07:00'), checkOut:ec('2026-05-04','16:00'), status:'Present' },
      { date:'2026-05-06', checkIn:ec('2026-05-06','08:00'), checkOut:ec('2026-05-06','12:00'), status:'Present' }, // Festivo Extrao 100% = 4h
    ]),

    // TST-004 Carmen Vélez — Estándar · Viernes Santo + Feriado + Domingo
    ...forEmp(empIds['TST-004'], [
      { date:'2026-04-03', checkIn:ec('2026-04-03','08:00'), checkOut:ec('2026-04-03','16:00'), status:'Present' }, // Viernes Santo Extrao 100% = 8h
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','16:00'), status:'Present' },
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-28','18:00'), status:'Present' }, // Supl 50% = 2h
      { date:'2026-05-01', checkIn:ec('2026-05-01','07:00'), checkOut:ec('2026-05-01','16:00'), status:'Present' }, // Feriado Extrao 100% = 9h
      { date:'2026-05-03', checkIn:ec('2026-05-03','08:00'), checkOut:ec('2026-05-03','14:00'), status:'Present' }, // Domingo Extrao 100% = 6h
      { date:'2026-05-04', checkIn:ec('2026-05-04','07:00'), checkOut:ec('2026-05-04','16:00'), status:'Present' },
    ]),

    // TST-005 Pedro Jiménez — Turno tarde (19:00-23:00) · Solo recargo nocturno 25%
    ...forEmp(empIds['TST-005'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','19:00'), checkOut:ec('2026-04-27','23:00'), status:'Present' }, // Noct 25% = 4h
      { date:'2026-04-28', checkIn:ec('2026-04-28','19:00'), checkOut:ec('2026-04-28','23:00'), status:'Present' }, // Noct 25% = 4h
      { date:'2026-04-29', checkIn:ec('2026-04-29','19:10'), checkOut:ec('2026-04-29','23:00'), status:'Late'    }, // Noct 25% = 4h (llegó 10 min tarde)
      { date:'2026-04-30', checkIn:ec('2026-04-30','19:00'), checkOut:ec('2026-04-30','23:00'), status:'Present' }, // Noct 25% = 4h
      { date:'2026-05-04', checkIn:ec('2026-05-04','19:00'), checkOut:ec('2026-05-04','23:00'), status:'Present' }, // Noct 25% = 4h
      { date:'2026-05-05', checkIn:ec('2026-05-05','19:00'), checkOut:ec('2026-05-05','23:00'), status:'Present' }, // Noct 25% = 4h
    ]),

    // TST-006 María López — Turno tarde · Noct 25% + SupNoc 100% + Sábado/Domingo
    ...forEmp(empIds['TST-006'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','19:00'), checkOut:ec('2026-04-27','23:00'), status:'Present' }, // Noct 25% = 4h
      { date:'2026-04-28', checkIn:ec('2026-04-28','19:00'), checkOut:ec('2026-04-29','00:30'), status:'Present' }, // Noct 25%=4h + Supl50%=1h + SupNoc100%=30m
      { date:'2026-04-29', checkIn:ec('2026-04-29','19:00'), checkOut:ec('2026-04-30','01:00'), status:'Present' }, // Noct 25%=4h + Supl50%=1h + SupNoc100%=1h
      { date:'2026-05-02', checkIn:ec('2026-05-02','19:00'), checkOut:ec('2026-05-02','22:00'), status:'Present' }, // Sábado Extrao 100% = 3h
      { date:'2026-05-03', checkIn:ec('2026-05-03','19:00'), checkOut:ec('2026-05-03','22:00'), status:'Present' }, // Domingo Extrao 100% = 3h
      { date:'2026-05-04', checkIn:ec('2026-05-04','19:00'), checkOut:ec('2026-05-04','23:00'), status:'Present' }, // Noct 25% = 4h
    ]),

    // TST-007 Sofía Castro — Variable (4h req) · Supl 50% + Sábado
    ...forEmp(empIds['TST-007'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','08:00'), checkOut:ec('2026-04-27','13:00'), status:'Present' }, // 5h / 4h req → Supl 50% = 1h
      { date:'2026-04-28', checkIn:ec('2026-04-28','08:00'), checkOut:ec('2026-04-28','15:30'), status:'Present' }, // 7h30m / 4h req → Supl 50% = 3h30m
      { date:'2026-04-29', checkIn:ec('2026-04-29','08:00'), checkOut:ec('2026-04-29','12:30'), status:'Present' }, // 4h30m / 4h req → Supl 50% = 30m
      { date:'2026-04-30', checkIn:ec('2026-04-30','08:00'), checkOut:ec('2026-04-30','12:00'), status:'Present' }, // exacto 4h = sin extras
      { date:'2026-05-02', checkIn:ec('2026-05-02','09:00'), checkOut:ec('2026-05-02','13:00'), status:'Present' }, // Sábado Extrao 100% = 4h
      { date:'2026-05-04', checkIn:ec('2026-05-04','08:00'), checkOut:ec('2026-05-04','12:00'), status:'Present' }, // exacto 4h = sin extras
      { date:'2026-05-05', checkIn:ec('2026-05-05','08:00'), checkOut:ec('2026-05-05','14:00'), status:'Present' }, // 6h / 4h req → Supl 50% = 2h
    ]),

    // TST-008 Roberto Aguirre — Variable · Supl 50% + Feriado
    ...forEmp(empIds['TST-008'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','09:00'), checkOut:ec('2026-04-27','15:00'), status:'Present' }, // 6h / 4h req → Supl 50% = 2h
      { date:'2026-04-28', checkIn:ec('2026-04-28','09:00'), checkOut:ec('2026-04-28','13:00'), status:'Present' }, // exacto 4h = sin extras
      { date:'2026-04-30', checkIn:ec('2026-04-30','09:00'), checkOut:ec('2026-04-30','16:00'), status:'Present' }, // 7h / 4h req → Supl 50% = 3h
      { date:'2026-05-01', checkIn:ec('2026-05-01','09:00'), checkOut:ec('2026-05-01','14:00'), status:'Present' }, // Feriado Extrao 100% = 5h
      { date:'2026-05-04', checkIn:ec('2026-05-04','09:00'), checkOut:ec('2026-05-04','15:00'), status:'Present' }, // 6h / 4h req → Supl 50% = 2h
      { date:'2026-05-05', checkIn:ec('2026-05-05','09:00'), checkOut:ec('2026-05-05','13:00'), status:'Present' }, // exacto 4h = sin extras
    ]),

    // TST-009 Diana Flores — Rotativo · Semana 27-abr=rot0(07:00-16:00), 4-may=rot1(08:00-17:00)
    ...forEmp(empIds['TST-009'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','19:00'), status:'Present' }, // rot0 → Supl 50% = 3h
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-28','16:00'), status:'Present' }, // rot0 → Normal
      { date:'2026-04-29', checkIn:ec('2026-04-29','07:00'), checkOut:ec('2026-04-29','21:00'), status:'Present' }, // rot0 → Supl 50% = 5h
      { date:'2026-05-02', checkIn:ec('2026-05-02','08:00'), checkOut:ec('2026-05-02','12:00'), status:'Present' }, // Sábado Extrao 100% = 4h
      { date:'2026-05-04', checkIn:ec('2026-05-04','08:00'), checkOut:ec('2026-05-04','20:00'), status:'Present' }, // rot1 → Supl 50% = 3h
      { date:'2026-05-05', checkIn:ec('2026-05-05','08:00'), checkOut:ec('2026-05-05','17:00'), status:'Present' }, // rot1 → Normal
    ]),

    // TST-010 Jorge Ramírez — Rotativo · Supl + Feriado + Domingo
    ...forEmp(empIds['TST-010'], [
      { date:'2026-04-27', checkIn:ec('2026-04-27','07:00'), checkOut:ec('2026-04-27','16:00'), status:'Present' }, // rot0 → Normal
      { date:'2026-04-28', checkIn:ec('2026-04-28','07:00'), checkOut:ec('2026-04-28','18:30'), status:'Present' }, // rot0 → Supl 50% = 2h30m
      { date:'2026-05-01', checkIn:ec('2026-05-01','07:00'), checkOut:ec('2026-05-01','15:00'), status:'Present' }, // Feriado Extrao 100% = 8h
      { date:'2026-05-03', checkIn:ec('2026-05-03','10:00'), checkOut:ec('2026-05-03','16:00'), status:'Present' }, // Domingo Extrao 100% = 6h
      { date:'2026-05-04', checkIn:ec('2026-05-04','08:00'), checkOut:ec('2026-05-04','17:00'), status:'Present' }, // rot1 → Normal
      { date:'2026-05-05', checkIn:ec('2026-05-05','08:00'), checkOut:ec('2026-05-05','23:00'), status:'Present' }, // rot1 → Supl 50% = 6h
    ]),
  ]

  // Crear todos los registros
  for (const r of allRecords) {
    await prisma.attendanceRecord.create({
      data: {
        tenantId:       TENANT_ID,
        employeeId:     r.employeeId,
        date:           r.date,
        checkInTime:    r.checkIn,
        checkOutTime:   r.checkOut,
        status:         r.status,
        registeredFrom: 'web',
      },
    })
  }

  console.log(`✅ ${allRecords.length} registros de asistencia creados.\n`)
  console.log('Casos cubiertos:')
  console.log('  Suplementaria 50%      → TST-001,003,004,007,008,009,010')
  console.log('  Supl. nocturna 100%    → TST-002,003,006')
  console.log('  Recargo nocturno 25%   → TST-005,006 (turno 19:00-23:00)')
  console.log('  Extrao. sábado         → TST-001,003,006,007,009')
  console.log('  Extrao. domingo        → TST-002,004,006,010')
  console.log('  Extrao. feriado        → TST-002,003,004,008,010')
  console.log('  Viernes Santo          → TST-004')
  console.log('\n🔑 Credenciales: usuario=tst001..tst010 | clave=Test1234! | PIN=1234')
}

main().then(() => prisma.$disconnect()).catch(e => { console.error('❌ Error:', e); prisma.$disconnect() })
