import prisma from '../prisma'

// ── Crea notificación en DB y envía push a los dispositivos correspondientes ──
export async function createNotificationWithPush(data: {
  tenantId?: string | null
  forAdmin:  boolean
  title:     string
  body:      string
  type?:     string
}) {
  // 1. Crear notificación en DB
  const notif = await prisma.notification.create({
    data: {
      tenantId:    data.tenantId ?? null,
      forAdmin:    data.forAdmin,
      forEmployee: false,
      title:       data.title,
      body:        data.body,
      type:        data.type ?? 'info',
    },
  })

  // 2. Enviar push (fire-and-forget)
  sendPushForNotification(data.tenantId ?? null, data.forAdmin, data.title, data.body).catch(() => {})

  return notif
}

async function sendPushForNotification(
  tenantId: string | null,
  forAdmin: boolean,
  title: string,
  body: string,
) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return

  if (forAdmin && !tenantId) {
    // → notificación para superadmin
    const tokens = await prisma.deviceToken.findMany({ where: { userType: 'superadmin' } })
    await sendToTokens(tokens.map(t => t.token), title, body)
  } else if (!forAdmin && tenantId) {
    // → notificación para admin del tenant
    const users  = await prisma.user.findMany({ where: { tenantId, isDeleted: false }, select: { id: true } })
    const ids    = users.map(u => u.id)
    if (!ids.length) return
    const tokens = await prisma.deviceToken.findMany({ where: { userId: { in: ids }, userType: 'admin' } })
    await sendToTokens(tokens.map(t => t.token), title, body)
  }
}

const FCM_URL = 'https://fcm.googleapis.com/v1/projects/tiempoya-admin/messages:send'

let _accessToken: string | null = null
let _tokenExpiry  = 0

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

  const sa = JSON.parse(serviceAccount)

  // JWT manual para Google OAuth2
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const now     = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url')

  const crypto   = await import('crypto')
  const sign     = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(sa.private_key, 'base64url')
  const jwt = `${header}.${payload}.${sig}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json() as { access_token: string; expires_in: number }

  _accessToken = data.access_token
  _tokenExpiry  = Date.now() + (data.expires_in - 60) * 1000
  return _accessToken
}

async function sendToTokens(tokens: string[], title: string, body: string) {
  if (!tokens.length) return
  const accessToken = await getAccessToken()
  const expired: string[] = []

  await Promise.all(tokens.map(async token => {
    const res = await fetch(FCM_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: { priority: 'high' },
          webpush: { notification: { icon: '/icons/icon-192.webp' } },
        },
      }),
    })
    if (!res.ok) {
      const err  = await res.json().catch(() => ({})) as any
      const code = err?.error?.details?.[0]?.errorCode ?? ''
      if (['UNREGISTERED', 'INVALID_ARGUMENT'].includes(code)) expired.push(token)
    }
  }))

  if (expired.length) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: expired } } })
  }
}

export async function sendPushToUser(
  userId: string,
  userType: 'admin' | 'superadmin',
  msg: { title: string; body: string; data?: Record<string, string> },
) {
  try {
    const tokens = await prisma.deviceToken.findMany({ where: { userId, userType } })
    if (!tokens.length) return

    const accessToken = await getAccessToken()
    const expired: string[] = []

    await Promise.all(tokens.map(async dt => {
      const res = await fetch(FCM_URL, {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token:        dt.token,
            notification: { title: msg.title, body: msg.body },
            data:         msg.data ?? {},
            android:      { priority: 'high' },
            webpush:      { notification: { icon: '/icons/icon-192.webp' } },
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any
        const code = err?.error?.details?.[0]?.errorCode ?? ''
        if (['UNREGISTERED', 'INVALID_ARGUMENT'].includes(code)) expired.push(dt.token)
      }
    }))

    // Limpiar tokens expirados
    if (expired.length) {
      await prisma.deviceToken.deleteMany({ where: { token: { in: expired } } })
    }
  } catch (e) {
    console.warn('[fcm] sendPushToUser error:', e)
  }
}
