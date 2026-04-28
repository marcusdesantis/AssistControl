import { type NextRequest } from 'next/server'
import { verifyToken, getTenantCapabilities, prisma } from '@attendance/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Unauthorized', { status: 401 })

  let tenantId: string
  try {
    const payload = verifyToken(token)
    if (payload.type !== 'admin') return new Response('Unauthorized', { status: 401 })
    tenantId = payload.tenantId
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const caps = await getTenantCapabilities(tenantId)
  if (!caps.prioritySupport?.enabled) return new Response('Forbidden', { status: 403 })

  const ticket = await prisma.supportTicket.findFirst({ where: { id, tenantId } })
  if (!ticket) return new Response('Not Found', { status: 404 })

  const encoder = new TextEncoder()
  let lastChecked = new Date()
  let intervalId: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      intervalId = setInterval(async () => {
        try {
          const messages = await prisma.supportMessage.findMany({
            where: { ticketId: id, createdAt: { gt: lastChecked } },
            orderBy: { createdAt: 'asc' },
          })
          if (messages.length > 0) {
            lastChecked = messages[messages.length - 1].createdAt
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'messages', data: messages })}\n\n`)
            )
          }
        } catch {
          clearInterval(intervalId)
          controller.close()
        }
      }, 3000)
    },
    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
