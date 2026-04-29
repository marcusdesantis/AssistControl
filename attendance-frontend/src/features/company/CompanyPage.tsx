import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Building2, Upload, X, Save, Loader2 } from 'lucide-react'
import { companyService } from './companyService'
import type { CompanyProfile } from './companyService'

const EMPTY: CompanyProfile = {
  name: '', legalName: '', taxId: '', businessLicense: '',
  logoBase64: '',
  street: '', betweenStreets: '', neighborhood: '', city: '',
  postalCode: '', municipality: '', state: '',
  phone1: '', phone2: '', fax: '', email: '', website: '',
}

function Field({
  label, value, onChange, placeholder, half,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  half?: boolean
}) {
  return (
    <div className={half ? 'flex flex-col gap-1' : 'flex flex-col gap-1'}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">{title}</span>
        <div className="flex-1 h-px bg-primary-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  )
}

export default function CompanyPage() {
  const [form,    setForm]    = useState<CompanyProfile>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    companyService.get()
      .then(data => setForm({ ...EMPTY, ...data }))
      .catch(() => setError('No se pudo cargar la información de la empresa.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof CompanyProfile) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setError('El logotipo no debe superar 500 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm(prev => ({ ...prev, logoBase64: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre de la empresa es requerido.'); return }
    setSaving(true)
    setError(null)
    try {
      const updated = await companyService.update(form)
      setForm({ ...EMPTY, ...updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Información de la empresa guardada.')
    } catch {
      setError('Error al guardar. Intente de nuevo.')
      toast.error('Error al guardar la empresa.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresa</h1>
          <p className="text-gray-500 text-sm mt-0.5">Información y perfil de la organización</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
            : saved
            ? <><Save className="w-4 h-4" />¡Guardado!</>
            : <><Save className="w-4 h-4" />Guardar</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {/* Logo + nombre */}
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div
              className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {form.logoBase64 ? (
                <img src={form.logoBase64} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Building2 className="w-8 h-8" />
                  <span className="text-xs">Logotipo</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
            >
              <Upload className="w-3 h-3" />
              {form.logoBase64 ? 'Cambiar' : 'Subir logo'}
            </button>
            {form.logoBase64 && (
              <button
                onClick={() => setForm(p => ({ ...p, logoBase64: '' }))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Quitar
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* Nombre y razón social */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Nombre / Razón social *" value={form.name} onChange={set('name')} />
            </div>
            <Field label="Nombre comercial" value={form.legalName} onChange={set('legalName')} />
            <Field label="RUC" value={form.taxId} onChange={set('taxId')} />
            <Field label="Representante" value={form.businessLicense} onChange={set('businessLicense')} />
          </div>
        </div>

        {/* Dirección */}
        <Section title="Dirección">
          <Field label="Ciudad" value={form.city} onChange={set('city')} />
          <Field label="Estado" value={form.state} onChange={set('state')} />
          <Field label="Código postal" value={form.postalCode} onChange={set('postalCode')} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Calle y número" value={form.street} onChange={set('street')} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Entre las calles" value={form.betweenStreets} onChange={set('betweenStreets')} />
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Contactos">
          <Field label="Teléfono 1" value={form.phone1} onChange={set('phone1')} placeholder="(000) 000-0000" />
          <Field label="Teléfono 2" value={form.phone2} onChange={set('phone2')} placeholder="(000) 000-0000" />
          <Field label="Fax" value={form.fax} onChange={set('fax')} />
          <Field label="Correo electrónico" value={form.email} onChange={set('email')} placeholder="contacto@empresa.com" />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Sitio web" value={form.website} onChange={set('website')} placeholder="https://www.empresa.com" />
          </div>
        </Section>

      </div>
    </div>
  )
}
