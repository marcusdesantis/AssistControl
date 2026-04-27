import { withPublic, apiOk } from '@attendance/shared'
import * as svc from '@/modules/checker/checker.service'

type Ctx = { params: Promise<{ id: string }> }

// .NET uses POST (not PATCH)
export const POST = withPublic(async (req: Request, { params }: Ctx) => {
  const { id }     = await params
  const checkerKey = new URL(req.url).searchParams.get('checkerKey') ?? ''
  await svc.markMessageRead(checkerKey, id)
  return apiOk(null, 'Mensaje marcado como leído.')
})
