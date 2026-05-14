import { useEffect, useRef } from 'react'
import { initPushNotifications, removePushListeners } from '@/utils/pushNotifications'

type Options = {
  /** Función para enviar el token al backend */
  registerToken: (token: string) => Promise<void>
  /** Callback cuando llega una notificación en foreground */
  onMessage?: () => void
}

export function usePushNotifications({ registerToken, onMessage }: Options) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    initPushNotifications({
      onToken: token => {
        console.log('[push] Token obtenido, registrando en backend...')
        registerToken(token)
          .then(() => console.log('[push] Token registrado OK'))
          .catch(err => console.warn('[push] Error registrando token:', err?.response?.status, err?.response?.data ?? err?.message))
      },
      onMessage: () => {
        window.dispatchEvent(new CustomEvent('notifications:refresh'))
        onMessage?.()
      },
    })

    return () => { removePushListeners() }
  }, [])
}
