import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { sysInvoicesService, type SysInvoice } from '../sysService'
import Pagination from '@/components/Pagination'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: currency.toUpperCase() }).format(amount)
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  paid:          { label: 'Pagado',     cls: 'bg-emerald-50 text-emerald-700' },
  open:          { label: 'Pendiente',  cls: 'bg-yellow-50 text-yellow-700'   },
  void:          { label: 'Anulado',    cls: 'bg-gray-100 text-gray-500'      },
  uncollectible: { label: 'Incobrable', cls: 'bg-red-50 text-red-700'         },
}

const CYCLE_LABELS: Record<string, string> = { monthly: 'Mensual', annual: 'Anual' }

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function SysInvoicesPage() {
  const [items,      setItems]      = useState<SysInvoice[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [query,      setQuery]      = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim())
      setPage(1)
    }, 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sysInvoicesService.list(page, pageSize, query || undefined)
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Error al cargar comprobantes')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, query])

  useEffect(() => { load() }, [load])

  const openReceipt = async (inv: SysInvoice) => {
    try {
      await sysInvoicesService.openReceipt(inv.id)
    } catch {
      toast.error('No se pudo abrir el comprobante')
    }
  }

  function runTour() {
    createTour([
      { element: '#tour-inv-header', title: 'Comprobantes de pago',  description: 'Registro histórico de todos los comprobantes generados en el sistema por pagos de suscripción de las empresas.' },
      { element: '#tour-inv-search', title: 'Buscar comprobante',    description: 'Busca por nombre de empresa, nombre del plan o número de comprobante. La búsqueda filtra en el servidor.' },
      { element: '#tour-inv-table',  title: 'Tabla de comprobantes', description: 'Muestra N° de comprobante, empresa, RUC, plan, ciclo, fecha, monto y estado. Haz clic en el ícono de documento para abrir el comprobante PDF de los registros pagados.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      <div id="tour-inv-header">
        <h1 className="text-2xl font-bold text-gray-900">Comprobantes de pago</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} registro{total !== 1 ? 's' : ''} en total</p>
        <div className="mt-1"><HelpButton onClick={runTour} /></div>
      </div>

      {/* Buscador */}
      <div id="tour-inv-search" className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar empresa, plan o N° comprobante..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        />
      </div>

      <div id="tour-inv-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">N° Comprobante</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">RUC</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ciclo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                        No se encontraron comprobantes
                      </td>
                    </tr>
                  ) : items.map(inv => {
                    const statusInfo = STATUS_LABELS[inv.status] ?? { label: inv.status, cls: 'bg-gray-100 text-gray-500' }
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{inv.invoiceNumber ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{inv.tenant.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{inv.tenant.taxId ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{inv.planName ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{CYCLE_LABELS[inv.billingCycle] ?? inv.billingCycle}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(inv.paidAt ?? inv.createdAt)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmtMoney(inv.amount, inv.currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {inv.invoiceNumber && inv.status === 'paid' && (
                            <button onClick={() => openReceipt(inv)} title="Ver comprobante"
                              className="text-gray-400 hover:text-primary-600 inline-flex">
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={total}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={size => { setPageSize(size); setPage(1) }}
            />
          </>
        )}
      </div>
    </div>
  )
}
