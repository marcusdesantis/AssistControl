import { withSuperadmin, apiOk } from '@attendance/shared'
import { approveTenant } from '@/modules/admin/admin.service'

export const POST = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await approveTenant(id)
  return apiOk({ ok: true }, 'Empresa aprobada correctamente.')
})
