import { withAdmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  token:    z.string().min(1),
  platform: z.enum(['web', 'android']).default('web'),
})

export const PUT = withAdmin(async (req, { admin }) => {
  const { token, platform } = schema.parse(await req.json())

  await prisma.deviceToken.upsert({
    where:  { token },
    update: { userId: admin.sub, userType: 'admin', platform, updatedAt: new Date() },
    create: { userId: admin.sub, userType: 'admin', token, platform },
  })

  return apiOk(null, 'Token registrado.')
})
