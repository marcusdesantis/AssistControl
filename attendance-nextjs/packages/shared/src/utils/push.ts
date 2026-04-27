export interface PushMessage {
  title: string
  body:  string
  data?: Record<string, unknown>
}

export async function sendExpoPush(token: string | null | undefined, msg: PushMessage): Promise<void> {
  if (!token || !token.startsWith('ExponentPushToken[')) return

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to:    token,
        title: msg.title,
        body:  msg.body,
        data:  msg.data ?? {},
        sound: 'default',
        priority: 'high',
      }),
    })
  } catch { /* fire-and-forget — no bloquear la respuesta */ }
}
