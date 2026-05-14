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
        registerToken(token).catch(() => {})
      },
      onMessage: () => {
        // Dispara el mismo evento que ya usa NotificationBell para refrescar
        window.dispatchEvent(new CustomEvent('notifications:refresh'))
        onMessage?.()
      },
    })

    return () => { removePushListeners() }
  }, [])
}
