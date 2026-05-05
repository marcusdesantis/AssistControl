const BASE_URL = 'https://pay.payphonetodoesposible.com'

function authHeader() {
  const appUrl = process.env.APP_URL ?? 'https://www.tiempoya.net'
  return {
    'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN ?? ''}`,
    'Content-Type':  'application/json',
    'Referer':       appUrl,
    'Origin':        appUrl,
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

export async function confirmPayment(id: number, clientTxId: string): Promise<PayphoneConfirmResult> {
  const delays = [0, 2000, 4000, 6000]   // 4 intentos: inmediato, +2s, +4s, +6s

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i])

    const body = JSON.stringify({ id, clientTxId })
    console.log(`[payphone] confirm intento ${i + 1} → body: ${body}`)

    const res = await fetch(`${BASE_URL}/api/button/V2/Confirm`, {
      method: 'POST',
      headers: authHeader(),
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
