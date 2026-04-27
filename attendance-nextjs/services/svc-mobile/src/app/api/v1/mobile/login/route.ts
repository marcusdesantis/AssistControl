import { withPublic, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/mobile/mobile.service'

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const POST = withPublic(async (req: Request) => {
  const body = schema.parse(await req.json())
  return apiOk(await svc.login(body.username, body.password))
})
