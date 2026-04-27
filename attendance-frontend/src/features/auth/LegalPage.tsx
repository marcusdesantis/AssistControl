import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Clock, Loader2 } from 'lucide-react'

interface Props { type: 'terms' | 'privacy' }

const META = {
  terms:   { title: 'Términos de uso',        heading: 'Términos de uso' },
  privacy: { title: 'Política de privacidad', heading: 'Política de privacidad' },
}

export default function LegalPage({ type }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const meta = META[type]

  useEffect(() => {
    document.title = `${meta.title} — AssistControl`
    const BASE_URL = import.meta.env.VITE_API_URL ?? ''
    axios.get(`${BASE_URL}/api/v1/public/legal`)
      .then(res => {
        const data = res.data?.data
        setContent(type === 'terms' ? data?.termsOfUse : data?.privacyPolicy)
      })
      .catch(() => setContent('No se pudo cargar el contenido. Intenta nuevamente.'))
      .finally(() => setLoading(false))
    return () => { document.title = 'AssistControl' }
  }, [type])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header — igual al de /sign-up */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">AssistControl</span>
          </div>
          <span className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Inicia sesión
            </Link>
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">

        {/* Título con flecha al mismo nivel */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/sign-up"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{meta.heading}</h1>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando…
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {content}
            </pre>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 bg-white py-5 px-6">
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} AssistControl · Sistema de Gestión de Asistencia
        </p>
      </footer>
    </div>
  )
}
