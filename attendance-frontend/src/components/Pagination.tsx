import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page:       number
  totalPages: number
  totalCount: number
  pageSize:   number
  onPageChange: (page: number) => void
  /** Opciones de tamaño de página. Si se provee, muestra el selector. */
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
}

export default function Pagination({
  page, totalPages, totalCount, pageSize,
  onPageChange, pageSizeOptions, onPageSizeChange,
}: Props) {
  if (totalPages <= 1 && !pageSizeOptions) return null

  const from = Math.min((page - 1) * pageSize + 1, totalCount)
  const to   = Math.min(page * pageSize, totalCount)

  // Máximo 5 números visibles centrados en la página actual
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end   = Math.min(totalPages, start + 4)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 bg-white text-sm shrink-0">

      {/* Izquierda: selector de tamaño de página */}
      {pageSizeOptions && onPageSizeChange ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {pageSizeOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>por página</span>
        </div>
      ) : (
        <span className="text-gray-500 text-xs">
          {from}–{to} de <span className="font-medium">{totalCount}</span>
        </span>
      )}

      {/* Centro: contador (cuando hay selector) */}
      {pageSizeOptions && (
        <span className="text-gray-400 text-xs hidden sm:block">
          {from}–{to} de <span className="font-medium text-gray-600">{totalCount}</span>
        </span>
      )}

      {/* Derecha: navegación de páginas */}
      {totalPages > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {start > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className="px-2.5 py-1 rounded hover:bg-gray-100 text-gray-600 text-sm">1</button>
              {start > 2 && <span className="px-1 text-gray-400">…</span>}
            </>
          )}
          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-2.5 py-1 rounded text-sm font-medium transition-colors
                ${p === page
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {p}
            </button>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
              <button onClick={() => onPageChange(totalPages)} className="px-2.5 py-1 rounded hover:bg-gray-100 text-gray-600 text-sm">{totalPages}</button>
            </>
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
