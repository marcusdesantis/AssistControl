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
// onMessage solo se registra una vez — Firebase no deduplica listeners automáticamente
let _messageListenerRegistered = false

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

    // Registrar listener de mensajes en foreground una sola vez por sesión
    if (!_messageListenerRegistered) {
      _messageListenerRegistered = true
      onMessage(messaging, payload => {
        onMsg({
          title: payload.notification?.title,
          body:  payload.notification?.body,
          data:  payload.data as Record<string, string> | undefined,
        })
      })
    }

    // Reutilizar token si ya fue obtenido en esta sesión
    if (_cachedToken) {
      onToken(_cachedToken)
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // 1. Registrar el SW (si ya existe, devuelve el registro existente)
    await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    // 2. Esperar a que el SW esté ACTIVO — recomendación oficial Firebase
    //    https://firebase.google.com/docs/cloud-messaging/js/client
    const swRegistration = await navigator.serviceWorker.ready

    // 3. Obtener token FCM pasando el registro activo explícitamente
    const token = await getTokenWithRetry(messaging, swRegistration)

    if (token) {
      _cachedToken = token
      onToken(token)
    }
  } catch (e) {
    console.warn('[push] Web init error:', e)
  }
}

async function getTokenWithRetry(
  messaging: ReturnType<typeof getMessaging>,
  swRegistration: ServiceWorkerRegistration,
): Promise<string | null> {
  try {
    return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration })
  } catch (e: any) {
    if (e?.name !== 'AbortError') throw e

    // AbortError: suscripción push inválida — limpiar y reintentar una sola vez
    console.warn('[push] AbortError en getToken — limpiando suscripción y reintentando...')
    await deleteToken(messaging).catch(() => {})
    const existing = await swRegistration.pushManager.getSubscription()
    if (existing) await existing.unsubscribe().catch(() => {})

    return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration })
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

// Brave bloquea FCM — detectar y omitir push web silenciosamente
async function isBraveBrowser(): Promise<boolean> {
  return !!(navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function'
    ? (navigator as any).brave.isBrave()
    : false
}

// ── Entrada pública ───────────────────────────────────────────────────────────
export async function initPushNotifications(callbacks: PushCallbacks) {
  if (isNative || Capacitor.isNativePlatform()) {
    await initAndroidPush(callbacks)
  } else if ('Notification' in window && 'serviceWorker' in navigator) {
    if (await isBraveBrowser()) {
      console.info('[push] Brave detectado — push web no compatible con FCM. Usar Chrome o Edge.')
      return
    }
    await initWebPush(callbacks)
  }
}

export async function removePushListeners() {
  if (!isNative && !Capacitor.isNativePlatform()) return
  const { PushNotifications } = await import('@capacitor/push-notifications')
  PushNotifications.removeAllListeners()
}
