import { apiOk } from '@attendance/shared'
import { prisma } from '@attendance/shared'

export const GET = async () => {
  const s = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  return apiOk({
    supportEmail:    s?.supportEmail    ?? null,
    supportPhone:    s?.supportPhone    ?? null,
    supportWhatsapp: s?.supportWhatsapp ?? null,
  })
}
