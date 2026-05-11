import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { toast } from 'sonner'

const ROOT_PATHS = new Set(['/dashboard', '/login', '/'])

export function useAndroidBack() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const exitReady = useRef(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const isRoot = ROOT_PATHS.has(location.pathname) || !canGoBack

      if (!isRoot) {
        navigate(-1)
        return
      }

      if (exitReady.current) {
        App.exitApp()
        return
      }

      exitReady.current = true
      toast('Presiona atrás de nuevo para salir', { duration: 2000 })
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => { exitReady.current = false }, 2000)
    })

    return () => {
      listener.then(h => h.remove())
      clearTimeout(exitTimer.current)
    }
  }, [navigate, location.pathname])
}
