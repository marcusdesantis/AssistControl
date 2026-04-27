import { withPublic, apiOk } from '@attendance/shared'
import * as svc from '@/modules/checker/checker.service'

export const GET = withPublic(async (req: Request) => {
  const checkerKey = new URL(req.url).searchParams.get('checkerKey') ?? ''
  return apiOk(await svc.getFeed(checkerKey))
})
