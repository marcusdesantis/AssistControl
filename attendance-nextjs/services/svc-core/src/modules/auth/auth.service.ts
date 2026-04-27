import { prisma, hashPassword, verifyPassword, signAdmin, getTenantCapabilities, DEFAULT_CAPABILITIES } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'
import type { RegisterDto, LoginDto, ChangePasswordDto } from './auth.schema'

const REFRESH_TOKEN_DAYS = 7
const ACCESS_TOKEN_HOURS = 24

function refreshExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + REFRESH_TOKEN_DAYS)
  return d
}

function accessExpiresAt(): Date {
  const d = new Date()
  d.setHours(d.getHours() + ACCESS_TOKEN_HOURS)
  return d
}

// ─── Register new tenant + admin ──────────────────────────────────────────────
export async function registerTenant(dto: RegisterDto) {
  const existing = await prisma.user.findFirst({ where: { username: dto.username.toLowerCase() } })
  if (existing) throw { code: 'USERNAME_TAKEN', message: 'El nombre de usuario ya está en uso.' }

  const tenant = await prisma.tenant.create({
    data: {
      name:       dto.companyName.trim(),
      timeZone:   dto.timeZone,
      checkerKey: uuidv4(),
    },
  })

  const user = await prisma.user.create({
    data: {
      tenantId:          tenant.id,
      username:          dto.username.toLowerCase().trim(),
      email:             dto.email.toLowerCase().trim(),
      passwordHash:      hashPassword(dto.password),
      role:              'Admin',
      mustChangePassword: false,
    },
  })

  const accessToken   = signAdmin({ sub: user.id, tenantId: tenant.id, role: user.role, username: user.username })
  const refreshString = uuidv4()
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshString, expiresAt: refreshExpiresAt() },
  })

  return {
    accessToken,
    refreshToken: refreshString,
    expiresAt:    accessExpiresAt(),
    user: { id: user.id, username: user.username, email: user.email, role: user.role, tenantId: tenant.id, mustChangePassword: user.mustChangePassword },
    capabilities: DEFAULT_CAPABILITIES,
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(dto: LoginDto) {
  const user = await prisma.user.findFirst({
    where: { username: dto.username.toLowerCase().trim(), isDeleted: false },
  })

  if (!user)
    throw { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' }

  if (!user.isActive)
    throw { code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta al administrador.' }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { isActive: true, timeZone: true, country: true } })
  if (!tenant?.isActive)
    throw { code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada. Contacta al administrador del sistema.' }

  if (user.lockedUntil && user.lockedUntil > new Date())
    throw { code: 'ACCOUNT_LOCKED', message: 'Cuenta bloqueada temporalmente. Intente más tarde.' }

  if (!verifyPassword(dto.password, user.passwordHash)) {
    const attempts    = user.failedLoginAttempts + 1
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null
    await prisma.user.update({
      where: { id: user.id },
      data:  { failedLoginAttempts: attempts, lockedUntil },
    })
    throw { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' }
  }

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, isRevoked: false },
    data:  { isRevoked: true },
  })

  const accessToken   = signAdmin({ sub: user.id, tenantId: user.tenantId, role: user.role, username: user.username })
  const refreshString = uuidv4()
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshString, expiresAt: refreshExpiresAt() },
  })
  await prisma.user.update({
    where: { id: user.id },
    data:  { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  const capabilities = await getTenantCapabilities(user.tenantId).catch(() => DEFAULT_CAPABILITIES)

  return {
    accessToken,
    refreshToken: refreshString,
    expiresAt:    accessExpiresAt(),
    user: { id: user.id, username: user.username, email: user.email, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword, timeZone: tenant.timeZone, country: tenant.country },
    capabilities,
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refreshToken(token: string) {
  const stored = await prisma.refreshToken.findFirst({ where: { token } })
  if (!stored || stored.isRevoked || stored.isUsed || stored.expiresAt < new Date())
    throw { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido o expirado.' }

  const user = await prisma.user.findFirst({ where: { id: stored.userId, isDeleted: false } })
  if (!user)
    throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }

  if (!user.isActive)
    throw { code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta al administrador.' }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { isActive: true, timeZone: true, country: true } })
  if (!tenant?.isActive)
    throw { code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada.' }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } })

  const newAccessToken   = signAdmin({ sub: user.id, tenantId: user.tenantId, role: user.role, username: user.username })
  const newRefreshString = uuidv4()
  await prisma.refreshToken.create({
    data: { userId: user.id, token: newRefreshString, expiresAt: refreshExpiresAt() },
  })

  const capabilities = await getTenantCapabilities(user.tenantId).catch(() => DEFAULT_CAPABILITIES)

  return {
    accessToken:  newAccessToken,
    refreshToken: newRefreshString,
    expiresAt:    accessExpiresAt(),
    user: { id: user.id, username: user.username, email: user.email, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword, timeZone: tenant.timeZone, country: tenant.country },
    capabilities,
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data:  { isRevoked: true },
  })
}

// ─── Change password ──────────────────────────────────────────────────────────
export async function changePassword(userId: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }

  if (!verifyPassword(dto.currentPassword, user.passwordHash))
    throw { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual es incorrecta.' }

  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: hashPassword(dto.newPassword), mustChangePassword: false },
  })
}

// ─── Verify password ──────────────────────────────────────────────────────────
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }
  return verifyPassword(password, user.passwordHash)
}
