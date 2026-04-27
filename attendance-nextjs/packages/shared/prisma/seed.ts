/**
 * Prisma seed — datos mínimos necesarios para arrancar el sistema.
 *
 * Run: pnpm --filter @attendance/shared prisma:seed
 * Or:  npx tsx packages/shared/prisma/seed.ts  (from repo root with DATABASE_URL set)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ROUNDS = 10

function hash(plain: string) {
  return bcrypt.hashSync(plain, ROUNDS)
}

async function main() {
  console.log('Seeding database...')

  // ── Superadmin ───────────────────────────────────────────────────────────────
  const superadminExists = await prisma.superadminAccount.findUnique({
    where: { email: 'superadmin@assistcontrol.com' },
  })
  if (!superadminExists) {
    await prisma.superadminAccount.create({
      data: {
        email:        'superadmin@assistcontrol.com',
        passwordHash: hash('SuperAdmin123!'),
        name:         'Super Admin',
        isActive:     true,
      },
    })
    console.log('  ✓ Superadmin created (superadmin@assistcontrol.com / SuperAdmin123!)')
  } else {
    console.log('  – Superadmin already exists')
  }

  // ── Plans ────────────────────────────────────────────────────────────────────
  const plans = [
    {
      name:         'Básico',
      description:  'Plan gratuito para comenzar. Incluye funciones esenciales de asistencia.',
      priceMonthly: 0,
      priceAnnual:  null,
      maxEmployees: 10,
      features:     { attendance: true, reports: false, api: false, multiLocation: false },
      isActive:     true,
      isFree:       true,
      isDefault:    true,
      sortOrder:    0,
    },
    {
      name:         'Profesional',
      description:  'Para equipos en crecimiento. Reportes avanzados y mayor capacidad.',
      priceMonthly: 29,
      priceAnnual:  290,
      maxEmployees: 50,
      features:     { attendance: true, reports: true, api: false, multiLocation: false },
      isActive:     true,
      isFree:       false,
      isDefault:    false,
      sortOrder:    1,
    },
    {
      name:         'Empresarial',
      description:  'Sin límites. API, múltiples ubicaciones y soporte prioritario.',
      priceMonthly: 79,
      priceAnnual:  790,
      maxEmployees: null,
      features:     { attendance: true, reports: true, api: true, multiLocation: true },
      isActive:     true,
      isFree:       false,
      isDefault:    false,
      sortOrder:    2,
    },
  ]

  for (const planData of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: planData.name } })
    if (!existing) {
      await prisma.plan.create({ data: planData })
      console.log(`  ✓ Plan created: ${planData.name}`)
    } else {
      console.log(`  – Plan already exists: ${planData.name}`)
    }
  }

  // ── Tenant demo ──────────────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Empresa Demo', isDeleted: false } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name:               'Empresa Demo',
        timeZone:           'America/Guayaquil',
        country:            'EC',
        employeeCodePrefix: 'EMP-',
      },
    })
    console.log(`  ✓ Tenant created: ${tenant.name}`)
  } else {
    console.log(`  – Tenant already exists: ${tenant.name}`)
  }

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminExists = await prisma.user.findFirst({
    where: { tenantId: tenant.id, username: 'admin', isDeleted: false },
  })
  if (!adminExists) {
    await prisma.user.create({
      data: {
        tenantId:           tenant.id,
        username:           'admin',
        email:              'admin@demo.com',
        passwordHash:       hash('Admin123!'),
        role:               'Admin',
        mustChangePassword: false,
      },
    })
    console.log('  ✓ Admin user created (admin / Admin123!)')
  } else {
    console.log('  – Admin user already exists')
  }

  // ── Default schedule ─────────────────────────────────────────────────────────
  let schedule = await prisma.schedule.findFirst({
    where: { tenantId: tenant.id, name: 'Horario Estándar', isDeleted: false },
  })
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        tenantId:             tenant.id,
        name:                 'Horario Estándar',
        type:                 'Fixed',
        lateToleranceMinutes: 10,
        requiredHoursPerDay:  8,
        days: [
          { day: 0, isWorkDay: false, entryTime: null,    exitTime: null,    lunchStart: null,    lunchEnd: null    },
          { day: 1, isWorkDay: true,  entryTime: '08:00', exitTime: '17:00', lunchStart: '13:00', lunchEnd: '14:00' },
          { day: 2, isWorkDay: true,  entryTime: '08:00', exitTime: '17:00', lunchStart: '13:00', lunchEnd: '14:00' },
          { day: 3, isWorkDay: true,  entryTime: '08:00', exitTime: '17:00', lunchStart: '13:00', lunchEnd: '14:00' },
          { day: 4, isWorkDay: true,  entryTime: '08:00', exitTime: '17:00', lunchStart: '13:00', lunchEnd: '14:00' },
          { day: 5, isWorkDay: true,  entryTime: '08:00', exitTime: '17:00', lunchStart: '13:00', lunchEnd: '14:00' },
          { day: 6, isWorkDay: false, entryTime: null,    exitTime: null,    lunchStart: null,    lunchEnd: null    },
        ],
      },
    })
    console.log('  ✓ Default schedule created: Horario Estándar')
  } else {
    console.log('  – Default schedule already exists')
  }

  // ── Departments ──────────────────────────────────────────────────────────────
  const departmentNames = ['Administración', 'Operaciones', 'Recursos Humanos']
  const departments: Record<string, string> = {}
  for (const name of departmentNames) {
    let dept = await prisma.department.findFirst({ where: { tenantId: tenant.id, name, isDeleted: false } })
    if (!dept) {
      dept = await prisma.department.create({ data: { tenantId: tenant.id, name } })
    }
    departments[name] = dept.id
  }
  console.log(`  ✓ ${departmentNames.length} departments ensured`)

  // ── Positions ────────────────────────────────────────────────────────────────
  const positionNames = ['Gerente', 'Asistente', 'Operario']
  const positions: Record<string, string> = {}
  for (const name of positionNames) {
    let pos = await prisma.position.findFirst({ where: { tenantId: tenant.id, name, isDeleted: false } })
    if (!pos) {
      pos = await prisma.position.create({ data: { tenantId: tenant.id, name } })
    }
    positions[name] = pos.id
  }
  console.log(`  ✓ ${positionNames.length} positions ensured`)

  // ── 1 employee demo (EMP-001) ────────────────────────────────────────────────
  const empExists = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, employeeCode: 'EMP-001', isDeleted: false },
  })
  if (!empExists) {
    await prisma.employee.create({
      data: {
        tenantId:        tenant.id,
        employeeCode:    'EMP-001',
        firstName:       'Carlos',
        lastName:        'García',
        email:           'carlos.garcia@demo.com',
        hireDate:        '2024-01-01',
        username:        'emp001',
        passwordHash:    hash('Pass1234!'),
        passwordDisplay: 'Pass1234!',
        pinHash:         hash('1234'),
        pinDisplay:      '1234',
        scheduleId:      schedule!.id,
        departmentId:    departments['Administración'],
        positionId:      positions['Gerente'],
        status:          'Active',
      },
    })
    console.log('  ✓ Employee created: EMP-001 Carlos García (PIN: 1234 / Pass1234!)')
  } else {
    console.log('  – Employee EMP-001 already exists')
  }

  console.log('\nSeed complete.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
