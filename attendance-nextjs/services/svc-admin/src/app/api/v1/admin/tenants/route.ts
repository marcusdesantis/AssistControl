import { withSuperadmin, apiOk, apiCreated } from '@attendance/shared'
import { listTenants, createTenant } from '@/modules/admin/admin.service'
import { z } from 'zod'

const createSchema = z.object({
  companyName: z.string().min(2),
  timeZone:    z.string().default('America/Guayaquil'),
  country:     z.string().min(2).default('EC'),
  username:    z.string().min(3),
  email:       z.string().email(),
  password:    z.string().min(6),
  planId:      z.string().uuid().optional(),
})

export const GET = withSuperadmin(async (req) => {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const search   = searchParams.get('search') ?? undefined
  return apiOk(await listTenants(page, pageSize, search))
})

export const POST = withSuperadmin(async (req) => {
  const dto = createSchema.parse(await req.json())
  return apiCreated(await createTenant(dto), 'Empresa creada correctamente.')
})
