import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/messages/messages.service'

type Ctx = { params: Promise<{ id: string }> }

// .NET uses POST (not PATCH) — [AllowAnonymous] accepting tenantId from query
export const POST = withAdmin(async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.markRead(id, tenantId)
  return apiOk(null, 'Mensaje procesado.')
})
