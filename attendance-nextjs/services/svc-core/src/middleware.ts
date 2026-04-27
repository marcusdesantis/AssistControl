import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }
  const res = NextResponse.next()
  for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v)
  return res
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':      '*',
    'Access-Control-Allow-Methods':     'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export const config = { matcher: '/api/:path*' }
