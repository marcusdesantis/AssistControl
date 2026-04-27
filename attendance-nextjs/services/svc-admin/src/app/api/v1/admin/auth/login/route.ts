import { withPublic, apiOk, signSuperadmin, verifyPassword } from '@attendance/shared'
import { z } from 'zod'
import { findSuperadminByEmail, updateLastLogin } from '@/modules/admin/admin.service'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const POST = withPublic(async (req) => {
  const { email, password } = schema.parse(await req.json())

  const account = await findSuperadminByEmail(email)
  if (!account || !account.isActive)
    return Response.json({ success: false, message: 'Credenciales inválidas.' }, { status: 401 })

  if (!verifyPassword(password, account.passwordHash))
    return Response.json({ success: false, message: 'Credenciales inválidas.' }, { status: 401 })

  await updateLastLogin(account.id)

  const token = signSuperadmin({ sub: account.id, email: account.email, name: account.name })
  return apiOk({ token, name: account.name, email: account.email }, 'Sesión iniciada.')
})
