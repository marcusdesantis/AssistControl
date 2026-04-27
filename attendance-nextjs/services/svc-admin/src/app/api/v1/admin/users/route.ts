import { withSuperadmin, apiOk, apiCreated } from '@attendance/shared'
import { listUsers, createSysUser } from '@/modules/admin/admin.service'
import { z } from 'zod'

const createSchema = z.object({
  tenantId: z.string().uuid(),
  username: z.string().min(3),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['Admin', 'Supervisor', 'Employee']).default('Admin'),
})

export const GET = withSuperadmin(async (req) => {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const search   = searchParams.get('search')   ?? undefined
  const tenantId = searchParams.get('tenantId') ?? undefined
  const role     = searchParams.get('role')     ?? undefined
  return apiOk(await listUsers(page, pageSize, search, tenantId, role))
})

export const POST = withSuperadmin(async (req) => {
  const dto = createSchema.parse(await req.json())
  return apiCreated(await createSysUser(dto), 'Usuario creado correctamente.')
})
