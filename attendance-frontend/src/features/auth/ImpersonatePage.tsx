import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export default function ImpersonatePage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore(s => s.setAuth)

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const raw = params.get('d')
      if (!raw) { navigate('/login'); return }

      const data = JSON.parse(atob(raw))
      setAuth(data.user, data.accessToken, data.refreshToken, data.capabilities)
      navigate('/', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
