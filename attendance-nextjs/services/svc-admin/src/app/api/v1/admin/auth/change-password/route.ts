import { withSuperadmin, apiOk, hashPassword, verifyPassword } from '@attendance/shared'
import { prisma } from '@attendance/shared'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6),
})

export const POST = withSuperadmin(async (req, { superadminId }) => {
  const { currentPassword, newPassword } = schema.parse(await req.json())

  const account = await prisma.superadminAccount.findUnique({ where: { id: superadminId } })
  if (!account) throw { code: 'NOT_FOUND', message: 'Cuenta no encontrada.' }

  if (!verifyPassword(currentPassword, account.passwordHash))
    throw { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual es incorrecta.' }

  await prisma.superadminAccount.update({
    where: { id: superadminId },
    data:  { passwordHash: hashPassword(newPassword) },
  })

  return apiOk(null, 'Contraseña actualizada correctamente.')
})
