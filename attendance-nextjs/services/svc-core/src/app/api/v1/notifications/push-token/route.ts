import { withAdmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  token:    z.string().min(1),
  platform: z.enum(['web', 'android', 'ios']).default('web'),
})

export const PUT = withAdmin(async (req, { admin }) => {
  const { token, platform } = schema.parse(await req.json())

  // Eliminar tokens anteriores del mismo usuario (reemplaza tokens expirados de Brave/otros)
  await prisma.deviceToken.deleteMany({
    where: { userId: admin.sub, userType: 'admin', token: { not: token } },
  })

  await prisma.deviceToken.upsert({
    where:  { token_userType: { token, userType: 'admin' } },
    update: { userId: admin.sub, platform, updatedAt: new Date() },
    create: { userId: admin.sub, userType: 'admin', token, platform },
  })

  return apiOk(null, 'Token registrado.')
})
