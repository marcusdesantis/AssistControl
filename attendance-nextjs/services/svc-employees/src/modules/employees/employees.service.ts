import { prisma, hashPassword, generatePin, generatePassword, sendEmail, generateQr, checkPlanLimit } from '@attendance/shared'
import type { CreateEmployeeDto, UpdateEmployeeDto } from './employees.schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  Active: 'Activo', Inactive: 'Inactivo', OnLeave: 'De baja',
}

const INCLUDE = {
  department: { select: { name: true } },
  position:   { select: { name: true } },
  schedule:   { select: { name: true } },
}

function toDto(emp: any) {
  return {
    id:              emp.id,
    employeeCode:    emp.employeeCode,
    firstName:       emp.firstName,
    lastName:        emp.lastName,
    fullName:        `${emp.firstName} ${emp.lastName}`,
    departmentId:    emp.departmentId,
    departmentName:  emp.department?.name ?? null,
    positionId:      emp.positionId,
    positionName:    emp.position?.name ?? null,
    scheduleId:      emp.scheduleId,
    scheduleName:    emp.schedule?.name ?? null,
    email:           emp.email,
    phone:           emp.phone,
    hireDate:        emp.hireDate,
    status:          emp.status,
    statusLabel:     STATUS_LABEL[emp.status as string] ?? emp.status,
    hasPin:          !!emp.pinHash,
    username:        emp.username,
    passwordDisplay: emp.passwordDisplay,
    pinDisplay:      emp.pinDisplay,
    tenantId:        emp.tenantId,
    createdAt:       emp.createdAt,
  }
}

async function nextEmployeeCode(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const prefix = tenant?.employeeCodePrefix ?? 'EMP-'
  let candidate = ''
  let seq = 0
  do {
    const last = await prisma.employee.findFirst({
      where:   { tenantId, employeeCode: { startsWith: prefix }, isDeleted: false },
      orderBy: { employeeCode: 'desc' },
    })
    seq = last ? (parseInt(last.employeeCode.replace(prefix, '')) || 0) + 1 : 1
    candidate = `${prefix}${String(seq).padStart(3, '0')}`
    const exists = await prisma.employee.findFirst({ where: { tenantId, employeeCode: candidate, isDeleted: false } })
    if (!exists) break
    seq++
  } while (true)
  return candidate
}

// ─── Get all (paginated) ──────────────────────────────────────────────────────
export async function getAll(
  tenantId: string, page = 1, pageSize = 20,
  search?: string, departmentId?: string, status?: string,
) {
  const where: any = { tenantId, isDeleted: false }
  if (search) {
    where.OR = [
      { firstName:    { contains: search, mode: 'insensitive' } },
      { lastName:     { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { email:        { contains: search, mode: 'insensitive' } },
    ]
  }
  if (departmentId) where.departmentId = departmentId
  if (status)       where.status       = status

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
    prisma.employee.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────
export async function getById(id: string, tenantId: string) {
  const emp = await prisma.employee.findFirst({ where: { id, tenantId, isDeleted: false }, include: INCLUDE })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  return toDto(emp)
}

// ─── Next code ────────────────────────────────────────────────────────────────
export async function getNextCode(tenantId: string) {
  const tenant   = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const prefix   = tenant?.employeeCodePrefix ?? 'EMP-'
  const nextCode = await nextEmployeeCode(tenantId)
  return { nextCode, prefix }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function create(tenantId: string, dto: CreateEmployeeDto) {
  const count = await prisma.employee.count({ where: { tenantId, isDeleted: false } })
  await checkPlanLimit(tenantId, 'employees', count, 'empleados')

  const schedule = await prisma.schedule.findFirst({ where: { id: dto.scheduleId, tenantId, isDeleted: false } })
  if (!schedule) throw { code: 'SCHEDULE_NOT_FOUND', message: 'El horario seleccionado no existe.' }

  if (dto.departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: dto.departmentId, tenantId, isDeleted: false } })
    if (!dept) throw { code: 'DEPT_NOT_FOUND', message: 'El departamento seleccionado no existe.' }
  }
  if (dto.positionId) {
    const pos = await prisma.position.findFirst({ where: { id: dto.positionId, tenantId, isDeleted: false } })
    if (!pos) throw { code: 'POS_NOT_FOUND', message: 'El cargo seleccionado no existe.' }
  }

  // Employee code
  let employeeCode: string
  if (dto.employeeCode?.trim()) {
    const exists = await prisma.employee.findFirst({
      where: { tenantId, employeeCode: dto.employeeCode.trim().toUpperCase(), isDeleted: false },
    })
    if (exists) throw { code: 'DUPLICATE_CODE', message: 'Ya existe un empleado con ese código.' }
    employeeCode = dto.employeeCode.trim().toUpperCase()
  } else {
    employeeCode = await nextEmployeeCode(tenantId)
  }

  // Username
  let username: string
  if (dto.username?.trim()) {
    username = dto.username.trim().toLowerCase()
    const taken = await prisma.employee.findFirst({ where: { username, isDeleted: false } })
    if (taken) throw { code: 'DUPLICATE_USERNAME', message: 'El nombre de usuario ya está en uso.' }
  } else {
    const base = employeeCode.toLowerCase().replace(/-/g, '')
    username   = base
    let suffix = 1
    while (await prisma.employee.findFirst({ where: { username, isDeleted: false } })) {
      username = `${base}${suffix++}`
    }
  }

  // Password
  let passwordPlain: string
  let generatedPassword: string | null = null
  if (dto.password?.trim()) {
    passwordPlain = dto.password.trim()
  } else {
    generatedPassword = generatePassword()
    passwordPlain     = generatedPassword
  }

  // PIN
  let pinPlain: string
  let generatedPin: string | null = null
  if (dto.pin?.trim()) {
    pinPlain = dto.pin.trim()
  } else {
    generatedPin = generatePin(6)
    pinPlain     = generatedPin
  }

  const emp = await prisma.employee.create({
    data: {
      tenantId,
      employeeCode,
      firstName:       dto.firstName.trim(),
      lastName:        dto.lastName.trim(),
      departmentId:    dto.departmentId ?? null,
      positionId:      dto.positionId   ?? null,
      scheduleId:      dto.scheduleId,
      email:           dto.email.trim().toLowerCase(),
      phone:           dto.phone?.trim() ?? null,
      hireDate:        dto.hireDate,
      username,
      passwordHash:    hashPassword(passwordPlain),
      passwordDisplay: passwordPlain,
      pinHash:         hashPassword(pinPlain),
      pinDisplay:      pinPlain,
    },
    include: INCLUDE,
  })

  return { employee: toDto(emp), generatedPin, generatedPassword }
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function update(id: string, tenantId: string, dto: UpdateEmployeeDto) {
  const emp = await prisma.employee.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const schedule = await prisma.schedule.findFirst({ where: { id: dto.scheduleId, tenantId, isDeleted: false } })
  if (!schedule) throw { code: 'SCHEDULE_NOT_FOUND', message: 'El horario seleccionado no existe.' }

  if (dto.departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: dto.departmentId, tenantId, isDeleted: false } })
    if (!dept) throw { code: 'DEPT_NOT_FOUND', message: 'El departamento seleccionado no existe.' }
  }
  if (dto.positionId) {
    const pos = await prisma.position.findFirst({ where: { id: dto.positionId, tenantId, isDeleted: false } })
    if (!pos) throw { code: 'POS_NOT_FOUND', message: 'El cargo seleccionado no existe.' }
  }

  // Username
  let newUsername = emp.username
  if (dto.username?.trim()) {
    newUsername = dto.username.trim().toLowerCase()
    if (newUsername !== emp.username) {
      const taken = await prisma.employee.findFirst({
        where: { username: newUsername, isDeleted: false, NOT: { id } },
      })
      if (taken) throw { code: 'USERNAME_TAKEN', message: 'El nombre de usuario ya está en uso.' }
    }
  }

  // PIN
  let pinHash    = emp.pinHash
  let pinDisplay = emp.pinDisplay
  if (dto.clearPin) {
    pinHash = null; pinDisplay = null
  } else if (dto.pin?.trim()) {
    pinHash    = hashPassword(dto.pin.trim())
    pinDisplay = dto.pin.trim()
  }

  // Password
  let passwordHash    = emp.passwordHash
  let passwordDisplay = emp.passwordDisplay
  if (dto.newPassword?.trim()) {
    passwordHash    = hashPassword(dto.newPassword.trim())
    passwordDisplay = dto.newPassword.trim()
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      firstName:       dto.firstName.trim(),
      lastName:        dto.lastName.trim(),
      departmentId:    dto.departmentId ?? null,
      positionId:      dto.positionId   ?? null,
      scheduleId:      dto.scheduleId,
      email:           dto.email.trim().toLowerCase(),
      phone:           dto.phone?.trim() ?? null,
      hireDate:        dto.hireDate,
      status:          dto.status,
      username:        newUsername,
      pinHash,
      pinDisplay,
      passwordHash,
      passwordDisplay,
    },
    include: INCLUDE,
  })
  return toDto(updated)
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function remove(id: string, tenantId: string) {
  const emp = await prisma.employee.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  await prisma.employee.update({ where: { id }, data: { isDeleted: true, status: 'Inactive' } })
}

// ─── Send credentials ─────────────────────────────────────────────────────────
export async function sendCredentials(id: string, tenantId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id, isDeleted: false, ...(tenantId ? { tenantId } : {}) },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  if (!emp.email)           throw { code: 'NO_EMAIL',    message: 'El empleado no tiene correo registrado.' }
  if (!emp.passwordDisplay) throw { code: 'NO_PASSWORD', message: 'No hay contraseña disponible. Asigna una contraseña primero.' }

  const qr = await generateQr(emp.employeeCode, 200)
  await sendEmail(emp.tenantId, {
    to:      emp.email,
    subject: 'Tus credenciales de acceso',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1e40af">Hola ${emp.firstName} ${emp.lastName}</h2>
        <p>Aquí están tus credenciales para acceder al sistema de asistencia:</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%">
          <tr style="background:#f3f4f6"><td style="padding:10px 12px;font-weight:bold;color:#374151">Código empleado</td><td style="padding:10px 12px;font-family:monospace;font-size:15px;color:#1e40af;font-weight:bold">${emp.employeeCode}</td></tr>
          <tr><td style="padding:10px 12px;font-weight:bold;color:#374151">Usuario app</td><td style="padding:10px 12px;font-family:monospace">${emp.username}</td></tr>
          <tr style="background:#f3f4f6"><td style="padding:10px 12px;font-weight:bold;color:#374151">Contraseña app</td><td style="padding:10px 12px;font-family:monospace">${emp.passwordDisplay}</td></tr>
          ${emp.pinDisplay ? `<tr><td style="padding:10px 12px;font-weight:bold;color:#374151">PIN checador</td><td style="padding:10px 12px;font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:4px">${emp.pinDisplay}</td></tr>` : ''}
        </table>
        <div style="margin:24px 0;text-align:center">
          <p style="color:#555;font-size:13px;margin-bottom:8px">Escanea este QR en el checador para registrar tu asistencia:</p>
          <img src="${qr}" alt="QR código empleado" width="200" height="200" style="border:1px solid #e5e7eb;border-radius:8px;padding:8px" />
          <p style="color:#6b7280;font-size:11px;margin-top:4px">${emp.employeeCode}</p>
        </div>
        <p style="color:#9ca3af;font-size:11px">Guarda estos datos en un lugar seguro.</p>
      </div>
    `,
  })
}
