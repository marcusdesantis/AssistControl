const BASE_URL = 'https://pay.payphonetodoesposible.com'

function authHeader() {
  return {
    'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN ?? ''}`,
    'Content-Type':  'application/json',
  }
}

export interface PayphoneConfirmResult {
  statusCode:          number   // 3=Aprobado, 2=Cancelado/Rechazado
  transactionId:       number
  clientTransactionId: string
  amount:              number
  currency:            string
  authorizationCode?:  string
  transactionStatus?:  string
  message?:            string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function getSessionCookie(): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/`, { method: 'GET' })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const arCookie = setCookie
      .split(',')
      .map(c => c.split(';')[0].trim())
      .filter(c => c.startsWith('ARRAffinity') || c.startsWith('ASLBSA'))
      .join('; ')
    console.log('[payphone] session cookie obtenido:', arCookie.substring(0, 60))
    return arCookie
  } catch {
    return ''
  }
}

export async function confirmPayment(id: string, clientTxId: string): Promise<PayphoneConfirmResult> {
  const sessionCookie = await getSessionCookie()
  const delays = [0, 2000, 4000, 6000]   // 4 intentos: inmediato, +2s, +4s, +6s

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i])

    const body = JSON.stringify({ id, clientTxId })
    console.log(`[payphone] confirm intento ${i + 1} → body: ${body}`)

    const headers: Record<string, string> = {
      ...authHeader(),
      'Content-Length': Buffer.byteLength(body).toString(),
      'Host':           'pay.payphonetodoesposible.com',
      'Content-Type':  'application/json',
      ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    }

    const res = await fetch(`${BASE_URL}/api/button/V2/Confirm`, {
      method: 'POST',
      headers,
      body,
    })

    const text = await res.text()
    console.log(`[payphone] confirm intento ${i + 1} ← status: ${res.status} body: ${text.substring(0, 300)}`)

    if (res.ok) {
      try { return JSON.parse(text) as PayphoneConfirmResult }
      catch { throw { code: 'PAYMENT_ERROR', message: `Payphone respuesta inválida: ${text.substring(0, 200)}` } }
    }

    const isLast = i === delays.length - 1
    if (isLast) throw { code: 'PAYMENT_ERROR', message: `Payphone error (${res.status}): ${text.substring(0, 200)}` }
  }

  throw { code: 'PAYMENT_ERROR', message: 'Max reintentos alcanzado.' }
}
