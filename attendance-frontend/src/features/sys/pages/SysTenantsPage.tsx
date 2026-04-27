import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, ArrowUpRight, ToggleLeft, ToggleRight, Plus, X, Bell, Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import { sysTenantsService, sysPlansService, type SysTenant, type SysPlan, type CreateTenantDto } from '../sysService'
import Pagination from '@/components/Pagination'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

// ─── Modal componer mensaje ───────────────────────────────────────────────────

type ComposeMode = 'notify' | 'email'

function ComposeModal({ mode, onClose, onSend }: {
  mode: ComposeMode
  onClose: () => void
  onSend: (data: { title?: string; subject?: string; body: string; type?: string; target?: string }) => Promise<void>
}) {
  const [title,   setTitle]   = useState('')
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [type,    setType]    = useState('info')
  const [target,  setTarget]  = useState<'admin' | 'company'>('admin')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (mode === 'notify' && !title.trim()) { toast.error('El título es requerido.'); return }
    if (mode === 'email'  && !subject.trim()) { toast.error('El asunto es requerido.'); return }
    if (!body.trim()) { toast.error('El mensaje es requerido.'); return }
    setSending(true)
    try {
      await onSend({ title: title || undefined, subject: subject || undefined, body, type, target })
      onClose()
    } finally { setSending(false) }
  }

  const isNotify = mode === 'notify'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isNotify ? <Bell className="w-4 h-4 text-slate-600" /> : <Mail className="w-4 h-4 text-slate-600" />}
            <h2 className="text-base font-semibold text-gray-900">
              {isNotify ? 'Enviar notificación' : 'Enviar correo'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isNotify && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enviar a</label>
              <select value={target} onChange={e => setTarget(e.target.value as 'admin' | 'company')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="admin">Administrador (usuario con email)</option>
                <option value="company">Empresa (correo de contacto)</option>
              </select>
            </div>
          )}

          {isNotify ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Actualización del sistema"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="info">Información</option>
                  <option value="success">Éxito</option>
                  <option value="warning">Advertencia</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asunto</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del correo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder={isNotify ? 'Escribe el mensaje de la notificación...' : 'Escribe el cuerpo del correo...'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isNotify ? 'Enviar notificación' : 'Enviar correo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const COUNTRIES: { code: string; name: string; tz: string }[] = [
  // América Latina
  { code: 'EC', name: 'Ecuador',              tz: 'America/Guayaquil'    },
  { code: 'CO', name: 'Colombia',             tz: 'America/Bogota'       },
  { code: 'PE', name: 'Perú',                 tz: 'America/Lima'         },
  { code: 'BO', name: 'Bolivia',              tz: 'America/La_Paz'       },
  { code: 'CL', name: 'Chile',                tz: 'America/Santiago'     },
  { code: 'AR', name: 'Argentina',            tz: 'America/Argentina/Buenos_Aires' },
  { code: 'MX', name: 'México',               tz: 'America/Mexico_City'  },
  { code: 'VE', name: 'Venezuela',            tz: 'America/Caracas'      },
  { code: 'PY', name: 'Paraguay',             tz: 'America/Asuncion'     },
  { code: 'UY', name: 'Uruguay',              tz: 'America/Montevideo'   },
  { code: 'PA', name: 'Panamá',               tz: 'America/Panama'       },
  { code: 'CR', name: 'Costa Rica',           tz: 'America/Costa_Rica'   },
  { code: 'GT', name: 'Guatemala',            tz: 'America/Guatemala'    },
  { code: 'HN', name: 'Honduras',             tz: 'America/Tegucigalpa'  },
  { code: 'SV', name: 'El Salvador',          tz: 'America/El_Salvador'  },
  { code: 'NI', name: 'Nicaragua',            tz: 'America/Managua'      },
  { code: 'DO', name: 'Rep. Dominicana',      tz: 'America/Santo_Domingo'},
  { code: 'CU', name: 'Cuba',                 tz: 'America/Havana'       },
  { code: 'PR', name: 'Puerto Rico',          tz: 'America/Puerto_Rico'  },
  { code: 'BR', name: 'Brasil',               tz: 'America/Sao_Paulo'    },
  // América del Norte
  { code: 'US', name: 'Estados Unidos (ET)',  tz: 'America/New_York'     },
  { code: 'US', name: 'Estados Unidos (CT)',  tz: 'America/Chicago'      },
  { code: 'US', name: 'Estados Unidos (MT)',  tz: 'America/Denver'       },
  { code: 'US', name: 'Estados Unidos (PT)',  tz: 'America/Los_Angeles'  },
  { code: 'CA', name: 'Canadá (Toronto)',     tz: 'America/Toronto'      },
  { code: 'CA', name: 'Canadá (Vancouver)',   tz: 'America/Vancouver'    },
  // Europa
  { code: 'ES', name: 'España',               tz: 'Europe/Madrid'        },
  { code: 'IT', name: 'Italia',               tz: 'Europe/Rome'          },
  { code: 'FR', name: 'Francia',              tz: 'Europe/Paris'         },
  { code: 'DE', name: 'Alemania',             tz: 'Europe/Berlin'        },
  { code: 'PT', name: 'Portugal',             tz: 'Europe/Lisbon'        },
  { code: 'GB', name: 'Reino Unido',          tz: 'Europe/London'        },
  { code: 'NL', name: 'Países Bajos',         tz: 'Europe/Amsterdam'     },
  { code: 'BE', name: 'Bélgica',              tz: 'Europe/Brussels'      },
  { code: 'CH', name: 'Suiza',                tz: 'Europe/Zurich'        },
  { code: 'AT', name: 'Austria',              tz: 'Europe/Vienna'        },
  { code: 'PL', name: 'Polonia',              tz: 'Europe/Warsaw'        },
  { code: 'RO', name: 'Rumanía',              tz: 'Europe/Bucharest'     },
  { code: 'GR', name: 'Grecia',               tz: 'Europe/Athens'        },
  { code: 'SE', name: 'Suecia',               tz: 'Europe/Stockholm'     },
  { code: 'NO', name: 'Noruega',              tz: 'Europe/Oslo'          },
  { code: 'DK', name: 'Dinamarca',            tz: 'Europe/Copenhagen'    },
  { code: 'FI', name: 'Finlandia',            tz: 'Europe/Helsinki'      },
  { code: 'TR', name: 'Turquía',              tz: 'Europe/Istanbul'      },
  { code: 'UA', name: 'Ucrania',              tz: 'Europe/Kiev'          },
  { code: 'RU', name: 'Rusia (Moscú)',         tz: 'Europe/Moscow'        },
  // Asia / Pacífico
  { code: 'AE', name: 'Emiratos Árabes',      tz: 'Asia/Dubai'           },
  { code: 'SA', name: 'Arabia Saudita',       tz: 'Asia/Riyadh'          },
  { code: 'IN', name: 'India',                tz: 'Asia/Kolkata'         },
  { code: 'CN', name: 'China',                tz: 'Asia/Shanghai'        },
  { code: 'JP', name: 'Japón',                tz: 'Asia/Tokyo'           },
  { code: 'KR', name: 'Corea del Sur',        tz: 'Asia/Seoul'           },
  { code: 'SG', name: 'Singapur',             tz: 'Asia/Singapore'       },
  { code: 'AU', name: 'Australia (Sydney)',    tz: 'Australia/Sydney'     },
  { code: 'AU', name: 'Australia (Perth)',     tz: 'Australia/Perth'      },
  { code: 'NZ', name: 'Nueva Zelanda',        tz: 'Pacific/Auckland'     },
  // África
  { code: 'ZA', name: 'Sudáfrica',            tz: 'Africa/Johannesburg'  },
  { code: 'NG', name: 'Nigeria',              tz: 'Africa/Lagos'         },
  { code: 'EG', name: 'Egipto',               tz: 'Africa/Cairo'         },
  { code: 'MA', name: 'Marruecos',            tz: 'Africa/Casablanca'    },
]

const TIMEZONES = [...new Set(COUNTRIES.map(c => c.tz))]

const DEFAULT_COUNTRY = COUNTRIES[0]
const EMPTY_FORM: CreateTenantDto = {
  companyName: '', timeZone: DEFAULT_COUNTRY.tz, country: DEFAULT_COUNTRY.code,
  username: '', email: '', password: '', planId: '',
}

function CreateTenantModal({ onClose, onCreated, plans }: {
  onClose: () => void
  onCreated: (t: SysTenant) => void
  plans: SysPlan[]
}) {
  const defaultPlan = plans.find(p => p.isDefault) ?? plans[0]
  const [form, setForm]       = useState<CreateTenantDto>({ ...EMPTY_FORM, planId: defaultPlan?.id ?? '' })
  const [saving, setSaving]   = useState(false)

  const set = (k: keyof CreateTenantDto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value
    if (k === 'country') {
      const found = COUNTRIES.find(c => c.tz === val || c.code === val)
      setForm(p => ({ ...p, country: found?.code ?? val, timeZone: found?.tz ?? p.timeZone }))
    } else {
      setForm(p => ({ ...p, [k]: val }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, planId: form.planId || undefined }
      const tenant = await sysTenantsService.create(payload)
      toast.success('Empresa creada correctamente.')
      onCreated(tenant)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al crear la empresa.')
    } finally { setSaving(false) }
  }

  const field = (label: string, key: keyof CreateTenantDto, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[key] as string} onChange={set(key)} placeholder={placeholder} required
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nueva empresa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos de la empresa</p>
          {field('Nombre de la empresa', 'companyName', 'text', 'Ej: Acme Corp')}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">País / Zona horaria</label>
            <select value={form.timeZone} onChange={set('country')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {COUNTRIES.map((c, i) => (
                <option key={i} value={c.tz}>{c.name} — {c.tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
            <select value={form.planId} onChange={set('planId')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (por defecto)' : ''}</option>)}
            </select>
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Usuario administrador</p>
          {field('Nombre de usuario', 'username', 'text', 'Ej: admin_acme')}
          {field('Correo electrónico', 'email', 'email', 'admin@acme.com')}
          {field('Contraseña', 'password', 'password', 'Mínimo 6 caracteres')}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Activa',    cls: 'bg-emerald-50 text-emerald-700' },
  trialing: { label: 'Prueba',    cls: 'bg-blue-50 text-blue-700' },
  past_due: { label: 'Vencida',   cls: 'bg-red-50 text-red-700' },
  canceled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function SysTenantsPage() {
  const [items,      setItems]      = useState<SysTenant[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [search,     setSearch]     = useState('')
  const [query,      setQuery]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [toggling,   setToggling]   = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [plans,      setPlans]      = useState<SysPlan[]>([])
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [compose,    setCompose]    = useState<{ mode: ComposeMode; tenantId?: string } | null>(null)
  const [confirmDeact, setConfirmDeact] = useState<SysTenant | null>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim())
      setPage(1)
    }, 400)
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(prev => prev.size === items.length ? new Set() : new Set(items.map(i => i.id)))

  const handleSingleAction = async (mode: ComposeMode, tenantId: string, data: { title?: string; subject?: string; body: string; type?: string; target?: string }) => {
    try {
      if (mode === 'notify') {
        await sysTenantsService.notify(tenantId, { title: data.title!, body: data.body, type: data.type })
        toast.success('Notificación enviada.')
      } else {
        await sysTenantsService.email(tenantId, { subject: data.subject!, body: data.body, target: data.target })
        toast.success('Correo enviado.')
      }
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Error al enviar.'); throw err }
  }

  const handleBulkAction = async (mode: ComposeMode, data: { title?: string; subject?: string; body: string; type?: string; target?: string }) => {
    try {
      const res = await sysTenantsService.bulk({ tenantIds: [...selected], action: mode, ...data })
      toast.success(res.message ?? 'Enviado correctamente.')
      setSelected(new Set())
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Error al enviar.'); throw err }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sysTenantsService.list(page, pageSize, query || undefined)
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch { toast.error('Error al cargar las empresas.') }
    finally { setLoading(false) }
  }, [page, pageSize, query])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    sysPlansService.list().then(p => {
      setPlans(p)
    }).catch(() => {})
  }, [])

  const handleToggle = async (t: SysTenant) => {
    setToggling(t.id)
    try {
      const updated = await sysTenantsService.toggle(t.id)
      setItems(prev => prev.map(x => x.id === t.id ? { ...x, isActive: updated.isActive } : x))
      toast.success(`Empresa ${updated.isActive ? 'activada' : 'desactivada'}.`)
    } catch { toast.error('Error al cambiar el estado.') }
    finally { setToggling(null) }
  }

  function runTour() {
    createTour([
      { element: '#tour-tenants-new',    title: 'Nueva empresa',         description: 'Crea una nueva empresa cliente en el sistema. Se generará un usuario administrador y se asignará el plan elegido.' },
      { element: '#tour-tenants-search', title: 'Buscar empresa',        description: 'Busca empresas por nombre. Los resultados se actualizan automáticamente mientras escribes.' },
      { element: '#tour-tenants-table',  title: 'Lista de empresas',     description: 'Aquí se listan todas las empresas registradas con su estado de suscripción. Haz clic en el nombre para ver el detalle completo.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      {showModal && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowModal(false)}
          onCreated={t => { setShowModal(false); setItems(prev => [t as SysTenant, ...prev]); setTotal(n => n + 1) }}
        />
      )}

      {confirmDeact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" style={{marginTop: 0}}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Desactivar empresa?</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              La empresa <span className="font-medium text-gray-800">{confirmDeact.name}</span> perderá acceso inmediatamente y sus usuarios serán desconectados.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDeact(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { const t = confirmDeact; setConfirmDeact(null); await handleToggle(t) }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {compose && (
        <ComposeModal
          mode={compose.mode}
          onClose={() => setCompose(null)}
          onSend={data =>
            compose.tenantId
              ? handleSingleAction(compose.mode, compose.tenantId, data)
              : handleBulkAction(compose.mode, data)
          }
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} empresa{total !== 1 ? 's' : ''} registradas</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-tenants-new" onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-900 transition-colors">
          <Plus className="w-4 h-4" /> Nueva empresa
        </button>
      </div>

      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-xl">
          <span className="text-sm font-medium">{selected.size} empresa{selected.size !== 1 ? 's' : ''} seleccionada{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex-1" />
          <button onClick={() => setCompose({ mode: 'notify' })}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            <Bell className="w-4 h-4" /> Notificación
          </button>
          <button onClick={() => setCompose({ mode: 'email' })}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            <Mail className="w-4 h-4" /> Correo
          </button>
          <button onClick={() => setSelected(new Set())}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div id="tour-tenants-search" className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        />
      </div>

      {/* Table */}
      <div id="tour-tenants-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-slate-700 cursor-pointer" />
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">País</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Empleados</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(t => {
                const sub = t.subscription
                const subStatus = sub?.status ?? 'canceled'
                const badge = STATUS[subStatus] ?? STATUS.canceled
                const isSelected = selected.has(t.id)
                return (
                  <tr key={t.id} className={`hover:bg-gray-50/50 ${isSelected ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(t.id)}
                        className="w-4 h-4 rounded accent-slate-700 cursor-pointer" />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-slate-600 text-xs font-bold">{t.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{t.name}</p>
                          {t.legalName && <p className="text-xs text-gray-400">{t.legalName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.country}</td>
                    <td className="px-4 py-3.5">
                      {sub ? (
                        <div>
                          <p className="font-medium text-gray-800">{sub.plan.name}</p>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">Sin suscripción</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t._count?.employees ?? 0}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => t.isActive ? setConfirmDeact(t) : handleToggle(t)} disabled={toggling === t.id}
                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${t.isActive ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-700'}`}>
                        {toggling === t.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : t.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {t.isActive ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setCompose({ mode: 'notify', tenantId: t.id })}
                          title="Enviar notificación"
                          className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setCompose({ mode: 'email', tenantId: t.id })}
                          title="Enviar correo"
                          className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => navigate(`/sys/tenants/${t.id}`)}
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5">
                          Ver <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Sin resultados</td></tr>
              )}
            </tbody>
          </table></div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
        />
      </div>
    </div>
  )
}
