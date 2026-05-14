import { Capacitor } from '@capacitor/core'
import { isNative } from './platform'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'

const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'AIzaSyBhPSEhtLvW5cEE-f-92PyuhAi5xGN942o',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'tiempoya-admin.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'tiempoya-admin',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'tiempoya-admin.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '233883273670',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:233883273670:web:6d57b881befc9674770ac7',
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? 'BKgRequKc_4uJDguVQ64C9MExgR5PDoBqTLLIJY7V8oGNjmQDfhCyogXsKYS6A--F8jRpcZDbZl-7-n7H-KGSVQ'

function getFirebaseApp() {
  return getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG)
}

// Token cacheado en memoria — getToken solo se llama una vez por sesión de navegador
let _cachedToken: string | null = null

export type PushMessage = {
  title?: string
  body?:  string
  data?:  Record<string, string>
}

type PushCallbacks = {
  onToken:   (token: string) => void
  onMessage: (msg: PushMessage) => void
}

// ── Web (navegador) ───────────────────────────────────────────────────────────
async function initWebPush({ onToken, onMessage: onMsg }: PushCallbacks) {
  try {
    const app       = getFirebaseApp()
    const messaging = getMessaging(app)

    onMessage(messaging, payload => {
      onMsg({
        title: payload.notification?.title,
        body:  payload.notification?.body,
        data:  payload.data as Record<string, string> | undefined,
      })
    })

    if (_cachedToken) {
      onToken(_cachedToken)
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // Registrar SW y forzar activación si hay una versión nueva esperando
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      await new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
      })
    }

    // Sin serviceWorkerRegistration explícito — Firebase usa el SW registrado en /firebase-messaging-sw.js
    let token: string | null = null
    try {
      token = await getToken(messaging, { vapidKey: VAPID_KEY })
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Limpiar suscripción inválida y reintentar con SW activo
        await deleteToken(messaging).catch(() => {})
        const activeSW = await navigator.serviceWorker.ready
        const sub = await activeSW.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        token = await getToken(messaging, { vapidKey: VAPID_KEY })
      } else {
        throw e
      }
    }
    if (token) {
      _cachedToken = token
      onToken(token)
    }
  } catch (e) {
    console.warn('[push] Web init error:', e)
  }
}

// ── Android nativo (Capacitor) ────────────────────────────────────────────────
async function initAndroidPush({ onToken, onMessage: onMsg }: PushCallbacks) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', ({ value }) => onToken(value))

    PushNotifications.addListener('pushNotificationReceived', n => {
      onMsg({ title: n.title, body: n.body, data: n.data })
    })

    PushNotifications.addListener('registrationError', err => {
      console.warn('[push] Android registration error:', err)
    })
  } catch (e) {
    console.warn('[push] Android init error:', e)
  }
}

// ── Entrada pública ───────────────────────────────────────────────────────────
export async function initPushNotifications(callbacks: PushCallbacks) {
  if (isNative || Capacitor.isNativePlatform()) {
    await initAndroidPush(callbacks)
  } else if ('Notification' in window && 'serviceWorker' in navigator) {
    await initWebPush(callbacks)
  }
}

export async function removePushListeners() {
  if (!isNative && !Capacitor.isNativePlatform()) return
  const { PushNotifications } = await import('@capacitor/push-notifications')
  PushNotifications.removeAllListeners()
}
