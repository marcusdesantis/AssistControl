import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  token:    z.string().min(1),
  platform: z.enum(['web', 'android', 'ios']).default('web'),
})

export const PUT = withSuperadmin(async (req, ctx) => {
  const { token, platform } = schema.parse(await req.json())
  const userId = ctx.superadminId

  // Eliminar tokens anteriores del mismo superadmin (reemplaza tokens expirados)
  await prisma.deviceToken.deleteMany({
    where: { userId, userType: 'superadmin', token: { not: token } },
  })

  await prisma.deviceToken.upsert({
    where:  { token_userType: { token, userType: 'superadmin' } },
    update: { userId, platform, updatedAt: new Date() },
    create: { userId, userType: 'superadmin', token, platform },
  })

  return apiOk(null, 'Token registrado.')
})
