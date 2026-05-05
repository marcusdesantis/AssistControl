import * as https from 'node:https'

const PAYPHONE_HOST = 'pay.payphonetodoesposible.com'
const BASE_URL      = `https://${PAYPHONE_HOST}`

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

function httpsPost(body: string, cookie: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const token   = process.env.PAYPHONE_TOKEN ?? ''
    const options: https.RequestOptions = {
      hostname: PAYPHONE_HOST,
      port:     443,
      path:     '/api/button/V2/Confirm',
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Host':           PAYPHONE_HOST,
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text: data }))
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function getSessionCookie(): Promise<string> {
  return new Promise(resolve => {
    const req = https.request({
      hostname: PAYPHONE_HOST,
      port:     443,
      path:     '/',
      method:   'GET',
    }, res => {
      const raw = res.headers['set-cookie'] ?? []
      const cookie = raw
        .map(c => c.split(';')[0].trim())
        .filter(c => c.startsWith('ARRAffinity') || c.startsWith('ASLBSA'))
        .join('; ')
      res.resume()
      console.log('[payphone] session cookie:', cookie.substring(0, 60))
      resolve(cookie)
    })
    req.on('error', () => resolve(''))
    req.end()
  })
}

export async function confirmPayment(id: string, clientTxId: string): Promise<PayphoneConfirmResult> {
  const sessionCookie = await getSessionCookie()
  const delays = [0, 2000, 4000, 6000]

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i])

    const body = JSON.stringify({ id, clientTxId })
    console.log(`[payphone] confirm intento ${i + 1} → body: ${body}`)

    const { status, text } = await httpsPost(body, sessionCookie)
    console.log(`[payphone] confirm intento ${i + 1} ← status: ${status} body: ${text.substring(0, 300)}`)

    if (status >= 200 && status < 300) {
      try { return JSON.parse(text) as PayphoneConfirmResult }
      catch { throw { code: 'PAYMENT_ERROR', message: `Payphone respuesta inválida: ${text.substring(0, 200)}` } }
    }

    const isLast = i === delays.length - 1
    if (isLast) throw { code: 'PAYMENT_ERROR', message: `Payphone error (${status}): ${text.substring(0, 200)}` }
  }

  throw { code: 'PAYMENT_ERROR', message: 'Max reintentos alcanzado.' }
}
