import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import { updateSysUser, resetUserPassword, deleteSysUser } from '@/modules/admin/admin.service'

type Ctx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  username:    z.string().min(3).optional(),
  email:       z.string().email().optional(),
  role:        z.enum(['Admin', 'Supervisor', 'Employee']).optional(),
  isActive:    z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
})

export const PATCH = withSuperadmin(async (req, _ctx, { params }: Ctx) => {
  const { id } = await params
  const dto = updateSchema.parse(await req.json())
  const { newPassword, ...rest } = dto
  if (newPassword) await resetUserPassword(id, newPassword)
  if (Object.keys(rest).length > 0) await updateSysUser(id, rest)
  return apiOk(null, 'Usuario actualizado.')
})

export const DELETE = withSuperadmin(async (_req, _ctx, { params }: Ctx) => {
  const { id } = await params
  await deleteSysUser(id)
  return apiOk(null, 'Usuario eliminado.')
})
