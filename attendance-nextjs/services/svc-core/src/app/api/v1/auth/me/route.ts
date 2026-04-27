import { withAdmin, apiOk } from '@attendance/shared'

export const GET = withAdmin(async (_req: Request, { admin }) => {
  return apiOk(admin)
})
