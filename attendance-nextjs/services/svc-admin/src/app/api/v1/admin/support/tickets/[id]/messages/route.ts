import { withSuperadmin, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/support/support.service'

const schema = z.object({ body: z.string().min(1).max(5000) })

export const POST = withSuperadmin(async (req, _ctx, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { body } = schema.parse(await req.json())
  return apiOk(await svc.adminAddMessage(id, body))
})
