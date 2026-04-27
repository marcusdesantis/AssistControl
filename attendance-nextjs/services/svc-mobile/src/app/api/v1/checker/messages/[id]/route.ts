import { withPublic, apiOk } from '@attendance/shared'
import * as svc from '@/modules/checker/checker.service'

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = withPublic(async (req: Request, { params }: Ctx) => {
  const { id }     = await params
  const checkerKey = new URL(req.url).searchParams.get('checkerKey') ?? ''
  await svc.deleteMessage(checkerKey, id)
  return apiOk(null, 'Mensaje eliminado.')
})
