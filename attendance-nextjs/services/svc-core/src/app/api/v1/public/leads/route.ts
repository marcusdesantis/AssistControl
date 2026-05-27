import { withPublic, apiOk, prisma, getClientIp } from '@attendance/shared'

export const POST = withPublic(async (req: Request) => {
  const body   = (await req.json().catch(() => ({}))) as any
  const page   = String(body.page   ?? 'home').slice(0, 100)
  const option = body.option ? String(body.option).slice(0, 500) : null
  const device = body.device ? String(body.device).slice(0, 20)  : null

  await prisma.leadEvent.create({
    data: {
      page,
      option,
      device,
      ip:        getClientIp(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    },
  })

  return apiOk(null, 'ok')
})
