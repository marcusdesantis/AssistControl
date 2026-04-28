import { type NextRequest } from 'next/server'
import { verifySuperadminToken, prisma } from '@attendance/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Unauthorized', { status: 401 })

  try {
    const payload = verifySuperadminToken(token)
    if (payload.type !== 'superadmin') return new Response('Unauthorized', { status: 401 })
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const ticket = await prisma.supportTicket.findFirst({ where: { id } })
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
