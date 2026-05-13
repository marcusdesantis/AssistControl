import { withSuperadmin, apiOk } from '@attendance/shared'
import { prisma, signAdmin, getTenantCapabilities, DEFAULT_CAPABILITIES } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withSuperadmin(async (_req: Request, _sa, { params }: Ctx) => {
  const { id } = await params

  const user = await prisma.user.findFirst({
    where:   { id, isDeleted: false },
    include: { tenant: { select: { isActive: true, timeZone: true, country: true, name: true } } },
  })
  if (!user) throw { code: 'NOT_FOUND', message: 'Usuario no encontrado.' }
  if (!user.tenant.isActive) throw { code: 'TENANT_INACTIVE', message: 'La empresa de este usuario está inactiva.' }

  const accessToken  = signAdmin({ sub: user.id, tenantId: user.tenantId, role: user.role, username: user.username })
  const refreshStr   = uuidv4()
  const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshStr, expiresAt },
  })

  const capabilities = await getTenantCapabilities(user.tenantId).catch(() => DEFAULT_CAPABILITIES)

  return apiOk({
    accessToken,
    refreshToken: refreshStr,
    user: {
      id:                user.id,
      username:          user.username,
      email:             user.email,
      role:              user.role,
      tenantId:          user.tenantId,
      mustChangePassword: user.mustChangePassword,
      timeZone:          user.tenant.timeZone,
      country:           user.tenant.country,
    },
    capabilities,
  })
})
