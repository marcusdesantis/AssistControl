import { withSuperadmin, apiOk } from '@attendance/shared'
import { cancelTenantDeletion } from '@/modules/admin/admin.service'

export const POST = withSuperadmin(async (_req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await cancelTenantDeletion(id), 'Solicitud de eliminación cancelada.')
})
