import { NextResponse } from 'next/server'

const CORE_URL = process.env.CORE_INTERNAL_URL ?? 'http://svc-core:3001'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const ip   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? ''

    fetch(`${CORE_URL}/api/v1/public/leads`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-forwarded-for': ip,
        'user-agent':      req.headers.get('user-agent') ?? '',
      },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch { /* fire and forget */ }

  return NextResponse.json({ ok: true })
}
