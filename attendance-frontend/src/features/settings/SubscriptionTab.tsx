import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  Check, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  ExternalLink, RefreshCw, CreditCard, X, Lock, FileText,
} from 'lucide-react'
import { billingService } from './billingService'
import { authService } from '@/features/auth/authService'
import type { InitiatePaymentResult } from './billingService'
import type { Plan, Subscription, Invoice } from '@/types/billing'
import { useAuthStore } from '@/store/authStore'
import type { PlanCapabilities } from '@/types/auth'
import { fmtDate as _fmtDate, fmtMoney as _fmtMoney, countryToLocale as _countryToLocale } from '@/utils/locale'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  // Suscripción
  active:        { label: 'Activa',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  trialing:      { label: 'Prueba',     color: 'text-blue-700 bg-blue-50 border-blue-200'          },
  past_due:      { label: 'Vencida',    color: 'text-red-700 bg-red-50 border-red-200'            },
  canceled:      { label: 'Cancelada',  color: 'text-gray-600 bg-gray-50 border-gray-200'         },
  // Factura
  paid:          { label: 'Pagado',     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  open:          { label: 'Pendiente',  color: 'text-yellow-700 bg-yellow-50 border-yellow-200'   },
  void:          { label: 'Anulado',    color: 'text-gray-600 bg-gray-50 border-gray-200'         },
  uncollectible: { label: 'Incobrable', color: 'text-red-700 bg-red-50 border-red-200'            },
}
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: 'text-gray-600 bg-gray-50 border-gray-200' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.color}`}>{s.label}</span>
}

// ─── Payphone Widget Modal ────────────────────────────────────────────────────

interface PayphoneData {
  clientTransactionId: string
  amountCents:         number
  storeId:             string
  token:               string
  reference:           string
  responseUrl:         string
  cancellationUrl:     string
}

function PayphoneModal({ data, onClose }: { data: PayphoneData; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let script: HTMLScriptElement | null = null

    function init() {
      // @ts-ignore
      if (typeof window.PPaymentButtonBox === 'undefined') {
        console.error('[Payphone] SDK no cargado aún')
        return
      }
      const container = document.getElementById('pp-button-container')
      if (!container) {
        console.error('[Payphone] contenedor #pp-button-container no encontrado')
        return
      }
      try {
        // @ts-ignore
        new window.PPaymentButtonBox({
          token:               data.token,
          storeId:             data.storeId,
          amount:              data.amountCents,
          amountWithTax:       0,
          amountWithoutTax:    data.amountCents,
          tax:                 0,
          service:             0,
          tip:                 0,
          clientTransactionId: data.clientTransactionId,
          currency:            'USD',
          reference:           data.reference,
          responseUrl:         data.responseUrl,
          cancellationUrl:     data.cancellationUrl,
        }).render('pp-button-container')
        console.log('[Payphone] widget renderizado OK')
      } catch (e) {
        console.error('[Payphone] error al renderizar:', e)
      }
    }

    // Inject CSS de Payphone
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css'
    document.head.appendChild(link)

    // El CSS de Payphone aplica padding/margin a #root — lo neutralizamos
    const fix = document.createElement('style')
    fix.id = 'pp-root-fix'
    fix.textContent = `
      #root { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
      :root  { font-size: 16px !important; font-family: inherit !important; }
    `
    document.head.appendChild(fix)

    // @ts-ignore
    if (typeof window.PPaymentButtonBox !== 'undefined') {
      init()
    } else {
      script = document.createElement('script')
      script.src = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js'
      script.onload = init
      document.head.appendChild(script)
    }

    return () => { script?.remove(); link.remove(); fix.remove() }
  }, [data])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header fijo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-900">Pagar con Payphone</p>
            <p className="text-xs text-gray-500 mt-0.5">{data.reference}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {/* Contenido scrollable */}
        <div className="px-6 py-5 flex flex-col items-center overflow-y-auto">
          <div id="pp-button-container" ref={containerRef} className="w-full" />
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Pago procesado de forma segura por Payphone
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Config por plan ─────────────────────────────────────────────────────────

const PLAN_CONFIG = [
  { bg: 'bg-white',       border: 'border-gray-200',    icon: 'text-primary-400', badge: null          },
  { bg: 'bg-primary-50',  border: 'border-primary-200', icon: 'text-primary-500', badge: null          },
  { bg: 'bg-primary-600', border: 'border-primary-600', icon: 'text-white',       badge: 'Más popular' },
  { bg: 'bg-primary-900', border: 'border-primary-900', icon: 'text-primary-300', badge: null          },
]

function PlanCard({
  plan, index, current, canRenew, isCycleUpgrade, willSchedule, scheduledDate: _scheduledDate, billingCycle, loading, onSelect,
}: {
  plan: Plan; index: number; current: boolean; canRenew: boolean
  isCycleUpgrade: boolean; willSchedule: boolean; scheduledDate: string | null
  billingCycle: 'monthly' | 'annual'; loading: boolean
  onSelect: (plan: Plan) => void
}) {
  const cfg    = PLAN_CONFIG[index] ?? PLAN_CONFIG[0]
  const isDark = index >= 2
  const price  = billingCycle === 'annual' ? (plan.priceAnnual ?? plan.priceMonthly * 12) : plan.priceMonthly
  const saving = plan.priceAnnual && billingCycle === 'annual'
    ? Math.round((1 - plan.priceAnnual / (plan.priceMonthly * 12)) * 100) : 0

  const textMain = isDark ? 'text-white'       : 'text-gray-900'
  const textSub  = isDark ? 'text-primary-200' : 'text-gray-500'
  const textFeat = isDark ? 'text-primary-100' : 'text-gray-600'
  const divider  = isDark ? 'border-white/15'  : 'border-gray-100'

  const features: string[] = Array.isArray(plan.features) ? plan.features : []

  const isDisabled = plan.isFree || (current && !canRenew && !willSchedule && !isCycleUpgrade) || loading
  const btnClass = plan.isFree || (current && !canRenew && !willSchedule && !isCycleUpgrade)
    ? isDark ? 'bg-white/10 text-white/40 cursor-default' : 'bg-gray-100 text-gray-400 cursor-default'
    : willSchedule
    ? isDark ? 'bg-white/15 text-white/70 hover:bg-white/20 font-medium' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium border border-amber-200'
    : isDark ? 'bg-white text-primary-700 hover:bg-primary-50 font-semibold'
             : 'bg-primary-600 text-white hover:bg-primary-700 font-semibold'

  return (
    <div className={`
      flex flex-col border-2 rounded-2xl p-6 shrink-0 w-[260px]
      transition-all duration-200 shadow-sm hover:shadow-md
      ${cfg.bg} ${current ? 'border-emerald-500' : cfg.border}
    `}>
      <div className="h-6 flex items-center gap-2 mb-3">
        {cfg.badge && (
          <span className="bg-primary-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
            ★ {cfg.badge}
          </span>
        )}
        {current && (
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-full">
            Plan actual
          </span>
        )}
      </div>

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/15' : 'bg-primary-50'}`}>
        <span className={cfg.icon}>
          {index === 0 && <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>}
          {index === 1 && <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
          {index === 2 && <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>}
          {index === 3 && <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
        </span>
      </div>

      <p className={`text-lg font-bold mb-1 ${textMain}`}>{plan.name}</p>
      <p className={`text-xs leading-relaxed mb-5 ${textSub}`}>{plan.description}</p>

      <div className="mb-5">
        {plan.isFree ? (
          <p className={`text-4xl font-black ${textMain}`}>Gratis</p>
        ) : (
          <div className="flex items-end gap-1.5">
            <p className={`text-4xl font-black ${textMain}`}>${price}</p>
            <div className="mb-1">
              <p className={`text-xs leading-tight ${textSub}`}>
                USD / {billingCycle === 'annual' ? 'año' : 'mes'}
              </p>
              {billingCycle === 'annual' && (
                <p className={`text-xs leading-tight ${textSub}`}>fact. anualmente</p>
              )}
            </div>
          </div>
        )}
        {saving > 0 && <p className="text-xs text-emerald-400 font-medium mt-1">Ahorra {saving}%</p>}
      </div>

      <button
        disabled={isDisabled || willSchedule}
        onClick={() => onSelect(plan)}
        className={`w-full py-2.5 rounded-xl text-sm transition-all mb-5 ${btnClass}`}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          : current && canRenew      ? 'Renovar plan'
          : isCycleUpgrade           ? 'Cambiar a anual'
          : current && !willSchedule ? 'Plan actual'
          : willSchedule             ? 'No disponible con plan activo'
          : plan.isFree              ? 'Plan gratuito'
          : 'Adquirir plan'}
      </button>
      {willSchedule && (
        <p className={`text-[11px] text-center -mt-4 mb-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
          Cancela tu plan actual para bajar
        </p>
      )}

      <div className={`border-t mb-4 ${divider}`} />
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-3 ${textSub}`}>
        {index === 0 ? 'Incluye:' : 'Todo lo anterior, más:'}
      </p>
      <ul className="space-y-2 flex-1">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-sm ${textFeat}`}>
            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-primary-300' : 'text-primary-500'}`} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Confirm Plan Body ────────────────────────────────────────────────────────

function ConfirmPlanBody({ plan, result, billingCycle }: { plan: Plan; result: any; billingCycle: 'monthly' | 'annual' }) {
  const isFree  = result.free === true
  const full    = (result.fullPriceCents ?? 0) / 100
  const credit  = (result.creditCents   ?? 0) / 100
  const total   = isFree ? 0 : (result.amountCents ?? 0) / 100
  const fmt     = (n: number) => `$${n.toFixed(2)} USD`

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{plan.name} — {billingCycle === 'annual' ? 'Anual' : 'Mensual'}</span>
          <span className="font-medium">{fmt(full)}</span>
        </div>
        {credit > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Crédito por días restantes</span>
            <span className="font-medium">−{fmt(credit)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
          <span>Total a pagar</span>
          <span className={isFree ? 'text-emerald-600' : ''}>{isFree ? '$0.00 USD' : fmt(total)}</span>
        </div>
      </div>
      {isFree && credit > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tu crédito de <strong>{fmt(credit)}</strong> cubre el costo del nuevo plan. El crédito no utilizado no es reembolsable.</span>
        </div>
      )}
      {credit > 0 && !isFree && (
        <p className="text-xs text-gray-400">El crédito corresponde al tiempo no utilizado de tu plan actual.</p>
      )}
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function SubscriptionTab() {
  const user             = useAuthStore(s => s.user)
  const timeZone         = user?.timeZone ?? 'America/Guayaquil'
  const country          = user?.country  ?? 'EC'
  const fmtDate  = (d: string | null | undefined) => _fmtDate(d, timeZone, country)
  const fmtMoney = (amount: number, currency = 'usd') => _fmtMoney(amount, currency, country)
  const setCapabilities  = useAuthStore(s => s.setCapabilities)
  const [plans,         setPlans]         = useState<Plan[]>([])
  const [subscription,  setSubscription]  = useState<Subscription | null>(null)
  const [invoices,      setInvoices]      = useState<Invoice[]>([])
  const [loading,       setLoading]       = useState(true)
  const [billingCycle,  setBillingCycle]  = useState<'monthly' | 'annual'>('monthly')
  const [canceling,       setCanceling]      = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelPwd,       setCancelPwd]       = useState('')
  const [cancelPwdError,  setCancelPwdError]  = useState<string | null>(null)
  const [cancelVerifying, setCancelVerifying] = useState(false)
  const [subscribingId,   setSubscribingId]  = useState<string | null>(null)
  const [payphoneData,    setPayphoneData]   = useState<PayphoneData | null>(null)
  const [confirmPlan,     setConfirmPlan]    = useState<{ plan: Plan; result: InitiatePaymentResult & { creditCents: number; fullPriceCents: number; amountCents: number } } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status === 'paid')      toast.success('¡Pago aprobado! Tu suscripción ha sido activada.')
    if (status === 'cancelled') toast.info('Pago cancelado. Puedes intentarlo nuevamente.')
    if (status === 'error')     toast.error('Ocurrió un error al procesar el pago.')
    if (status) {
      // Limpiar el param de la URL sin recargar
      const clean = new URL(window.location.href)
      clean.searchParams.delete('status')
      window.history.replaceState({}, '', clean.toString())
    }
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [p, s, inv] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
        billingService.getInvoices(1, 5),
      ])
      setPlans(p)
      setSubscription(s)
      setInvoices(inv.items)
      if (s) {
        setBillingCycle(s.billingCycle)
        if (s.plan?.capabilities) setCapabilities(s.plan.capabilities as PlanCapabilities)
      }
    } catch { toast.error('Error al cargar la suscripción.') }
    finally { setLoading(false) }
  }

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -290 : 290, behavior: 'smooth' })
  }

  async function handleSelectPlan(plan: Plan) {
    setSubscribingId(plan.id)
    try {
      // Solo calcular prorrateo — no activa nada en el backend
      const proration = await billingService.getProration(plan.id, billingCycle)
      setConfirmPlan({ plan, result: proration })
    } catch { toast.error('Error al calcular el cambio de plan.') }
    finally { setSubscribingId(null) }
  }

  async function handleConfirmPayment() {
    if (!confirmPlan) return
    const _proration = confirmPlan.result as any
    void _proration
    setConfirmPlan(null)

    setSubscribingId(confirmPlan.plan.id)
    try {
      const result = await billingService.initiatePayment(confirmPlan.plan.id, billingCycle)

      if ('scheduled' in result) {
        const date = _fmtDate(result.scheduledAt, timeZone, country)
        toast.success(`Cambio a "${confirmPlan.plan.name}" programado para el ${date}.`)
        await load()
        return
      }

      if ('subscription' in result) {
        setSubscription(result.subscription)
        if (result.subscription.plan?.capabilities) setCapabilities(result.subscription.plan.capabilities as PlanCapabilities)
        toast.success('Plan actualizado sin cargo adicional.')
        return
      }

      setPayphoneData(result)
    } catch { toast.error('Error al procesar el cambio de plan.') }
    finally { setSubscribingId(null) }
  }

  async function handleCancelConfirm() {
    if (!cancelPwd.trim()) return
    setCancelVerifying(true)
    setCancelPwdError(null)
    const ok = await authService.verifyPassword(cancelPwd)
    if (!ok) {
      setCancelPwdError('Contraseña incorrecta. Intenta de nuevo.')
      setCancelVerifying(false)
      return
    }
    setCancelVerifying(false)
    setShowCancelModal(false)
    setCancelPwd('')
    setCanceling(true)
    try {
      const sub = await billingService.cancelSubscription()
      setSubscription(sub)
      toast.success('Suscripción cancelada. Tu cuenta ha sido bajada al plan gratuito.')
    } catch { toast.error('Error al cancelar.') }
    finally { setCanceling(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  function runTour() {
    createTour([
      { element: '#tour-sub-current',  title: 'Tu suscripción actual',   description: 'Aquí ves el plan que tiene activa tu empresa, el ciclo de facturación (mensual o anual) y la fecha de vencimiento. Si el estado es "Vencida" el acceso al sistema queda limitado al plan gratuito.' },
      { element: '#tour-sub-plans',    title: 'Cambiar de plan',         description: 'Navega entre los planes disponibles con las flechas. Para subir de plan el cambio es inmediato. Para bajar de plan o cambiar de anual a mensual, el cambio se aplica al vencimiento del período actual.' },
      { element: '#tour-sub-cycle',    title: 'Ciclo de facturación',    description: 'Elige entre pago Mensual o Anual. El plan anual tiene un 17% de descuento. Puedes pasar de mensual a anual en cualquier momento; de anual a mensual el cambio se programa para el próximo período.' },
      { element: '#tour-sub-invoices', title: 'Historial de pagos',      description: 'Registro de todas las facturas generadas. Cada factura muestra el monto, la fecha y su estado (Pagado, Pendiente, etc.). Puedes descargar el comprobante con el ícono de PDF.' },
    ]).drive()
  }

  return (
    <div>

      {payphoneData && (
        <PayphoneModal data={payphoneData} onClose={() => setPayphoneData(null)} />
      )}

      {/* Modal cancelar suscripción */}
      {showCancelModal && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-1.5 w-full bg-red-500" />
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Cancelar suscripción</h3>
                  <p className="text-xs text-gray-500">Esta acción bajará tu cuenta al plan gratuito</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800">
                Perderás acceso a las funcionalidades del plan actual de forma inmediata.
              </div>
              <div className="flex flex-col gap-1 mb-4">
                <label className="text-xs font-medium text-gray-500">Ingresa tu contraseña para confirmar</label>
                <input
                  type="password"
                  value={cancelPwd}
                  onChange={e => { setCancelPwd(e.target.value); setCancelPwdError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCancelConfirm()}
                  autoFocus
                  placeholder="••••••••"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                {cancelPwdError && <p className="text-xs text-red-500 mt-1">{cancelPwdError}</p>}
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelPwd(''); setCancelPwdError(null) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Volver
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelVerifying || !cancelPwd.trim()}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {cancelVerifying ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando…</> : 'Cancelar suscripción'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmación con desglose de prorrateo */}
      {confirmPlan && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Confirmar cambio de plan</h3>
              <button onClick={() => setConfirmPlan(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ConfirmPlanBody plan={confirmPlan.plan} result={confirmPlan.result as any} billingCycle={billingCycle} />
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setConfirmPlan(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Cancelar
              </button>
              <button onClick={handleConfirmPayment}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700">
                {(confirmPlan.result as any).free === true ? 'Confirmar cambio' : 'Continuar al pago'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Estado actual ────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">Suscripción</p>
          <HelpButton onClick={runTour} />
        </div>
        {subscription && (
          <div id="tour-sub-current" className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suscripción activa</p>
              <p className="text-xl font-bold text-gray-900">{subscription.plan.name}</p>
              <p className="text-sm text-gray-500">
                {subscription.billingCycle === 'annual' ? 'Facturación anual' : 'Facturación mensual'}
                {subscription.currentPeriodEnd && ` · Vence ${fmtDate(subscription.currentPeriodEnd)}`}
              </p>
              {subscription.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Cancela el {fmtDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {subscription.scheduledPlanId && !subscription.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Cambio de plan programado para el {fmtDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {!subscription.plan.isFree && !subscription.cancelAtPeriodEnd && (
                <button onClick={() => { setCancelPwd(''); setCancelPwdError(null); setShowCancelModal(true) }} disabled={canceling}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1 mt-2 font-medium">
                  {canceling && <Loader2 className="w-3 h-3 animate-spin" />}
                  Cancelar suscripción
                </button>
              )}
            </div>
            <StatusBadge status={subscription.status} />
          </div>
        )}

      </div>

      {/* ── Planes ───────────────────────────────────────────────────────── */}
      <div id="tour-sub-plans" className="bg-gray-50 rounded-2xl border border-gray-200 mx-5 px-5 py-5">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <p className="text-gray-900 font-semibold text-base">Planes disponibles</p>
            <p className="text-gray-500 text-sm mt-0.5">Elige el plan que mejor se adapte a tu empresa</p>
          </div>
          <div id="tour-sub-cycle" className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl shrink-0 shadow-sm">
            <button onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'monthly' ? 'bg-primary-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Mensual
            </button>
            <button onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === 'annual' ? 'bg-primary-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Anual <span className={billingCycle === 'annual' ? 'text-primary-200' : 'text-emerald-600'}>· -17%</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => scroll('left')}
            className="absolute left-0 top-[40%] -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 shadow rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth"
            style={{ paddingLeft: '36px', paddingRight: '36px' }}>
            <div className="flex items-start gap-4" style={{ paddingBottom: '64px' }}>
              {plans.map((plan, i) => {
                const isCurrent        = subscription?.planId === plan.id
                const isSameCycle      = subscription?.billingCycle === billingCycle
                const daysLeft         = subscription?.daysUntilExpiry ?? null
                const inGrace          = !!subscription?.inGracePeriod
                const expiring         = daysLeft !== null && daysLeft <= 7
                const currentSortOrder = subscription?.plan?.sortOrder ?? 0
                const isDowngrade      = !plan.isFree && plan.sortOrder < currentSortOrder
                const isAnnualToMonthly = isCurrent && subscription?.billingCycle === 'annual' && billingCycle === 'monthly'
                const isMonthlyToAnnual = isCurrent && subscription?.billingCycle === 'monthly' && billingCycle === 'annual'

                // Renovar: mismo plan, mismo ciclo, próximo a vencer o en gracia
                const canRenew = isCurrent && isSameCycle && (expiring || inGrace)
                // Subir ciclo mensual → anual: siempre permitido
                const isCycleUpgrade = isMonthlyToAnnual
                // Downgrade de plan o bajar de anual a mensual mid-período
                const willSchedule = (isDowngrade || isAnnualToMonthly) && (daysLeft ?? 0) > 0

                return (
                  <PlanCard key={plan.id} plan={plan} index={i}
                    current={isCurrent}
                    canRenew={canRenew}
                    isCycleUpgrade={isCycleUpgrade}
                    willSchedule={willSchedule}
                    scheduledDate={willSchedule && subscription?.currentPeriodEnd ? subscription.currentPeriodEnd : null}
                    billingCycle={billingCycle}
                    loading={subscribingId === plan.id}
                    onSelect={handleSelectPlan}
                  />
                )
              })}
            </div>
          </div>
          <button onClick={() => scroll('right')}
            className="absolute right-0 top-[40%] -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 shadow rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1.5">
          <CreditCard className="w-3 h-3" />
          Pagos procesados de forma segura a través de Payphone
        </p>
      </div>

      {/* ── Facturas ─────────────────────────────────────────────────────── */}
      {invoices.length > 0 && (
        <div id="tour-sub-invoices" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">Historial de pagos</p>
            <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">N° Comprobante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ciclo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{inv.invoiceNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{inv.planName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{inv.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(inv.paidAt ?? inv.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmtMoney(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.invoiceNumber && inv.status === 'paid' && (
                          <button
                            onClick={() => billingService.openReceipt(inv.id).catch(() => toast.error('No se pudo abrir el comprobante'))}
                            title="Ver comprobante"
                            className="text-gray-400 hover:text-primary-600 inline-flex"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.hostedInvoiceUrl && (
                          <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer"
                            className="text-gray-400 hover:text-primary-600 inline-flex">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
