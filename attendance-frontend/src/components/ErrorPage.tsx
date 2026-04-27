import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'

export default function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let title = 'Error inesperado'
  let detail = 'Ocurrió un error al cargar esta página.'

  if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`
    detail = error.statusText || detail
  } else if (error instanceof Error) {
    title = error.name ?? title
    detail = error.message
  } else if (typeof error === 'string') {
    detail = error
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white border border-red-200 rounded-xl p-8 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-red-700">{title}</h1>
        <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto whitespace-pre-wrap break-words">
          {detail}
        </pre>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
