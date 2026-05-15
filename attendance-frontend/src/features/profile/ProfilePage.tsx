import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { User, Mail, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, Fingerprint, Scan, Grid3X3, X } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { isNative } from '@/utils/platform'
import * as bio from '@/services/biometricService'
import * as pinSvc from '@/services/pinService'

const ROLE_LABEL: Record<string, string> = {
  Admin: 'Administrador', Supervisor: 'Supervisor', Employee: 'Empleado',
}

interface PasswordForm {
  currentPassword: string
  newPassword:     string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken, capabilities } = useAuthStore()

  const [savingPwd,   setSavingPwd]   = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Seguridad móvil ──────────────────────────────────────────────────────────
  const [bioAvailable,  setBioAvailable]  = useState(false)
  const [bioEnabled,    setBioEnabled]    = useState(false)
  const [bioType,       setBioType]       = useState<bio.BiometricType>('none')
  const [pinEnabled,    setPinEnabled]    = useState(false)

  // Modal biométrico
  const [showBioModal,  setShowBioModal]  = useState(false)
  const [bioPass,       setBioPass]       = useState('')
  const [bioPassShow,   setBioPassShow]   = useState(false)
  const [bioLoading,    setBioLoading]    = useState(false)
  const [bioError,      setBioError]      = useState<string | null>(null)

  // Modal PIN
  const [showPinModal,  setShowPinModal]  = useState(false)
  const [pinModalMode,  setPinModalMode]  = useState<'create' | 'change'>('create')
  const [pinStep,       setPinStep]       = useState<'password' | 'newpin' | 'confirm'>('password')
  const [pinPass,       setPinPass]       = useState('')
  const [pinPassShow,   setPinPassShow]   = useState(false)
  const [newPin,        setNewPin]        = useState('')
  const [confirmPin,    setConfirmPin]    = useState('')
  const [pinLoading,    setPinLoading]    = useState(false)
  const [pinError,      setPinError]      = useState<string | null>(null)

  useEffect(() => {
    if (!isNative) return
    bio.isBiometricAvailable().then(avail => {
      setBioAvailable(avail)
      if (avail) {
        bio.getBiometricType().then(setBioType)
        bio.isBiometricEnabled().then(setBioEnabled)
      }
    })
    pinSvc.isPinEnabled().then(setPinEnabled)
  }, [])

  const bioLabel = bioType === 'facial' ? 'Huella/Face ID' : 'Huella digital'
  const bioTitle = bioType === 'facial' ? 'Activar Huella/Face ID' : 'Activar huella digital'
  const BioIcon  = bioType === 'facial' ? Scan : Fingerprint

  // ── Biométrico ───────────────────────────────────────────────────────────────
  const handleToggleBio = (val: boolean) => {
    if (val) { setBioPass(''); setBioError(null); setBioPassShow(false); setShowBioModal(true) }
    else {
      if (confirm(`¿Deseas desactivar el acceso con ${bioLabel}?`)) {
        bio.disableBiometric(); setBioEnabled(false)
      }
    }
  }

  const handleActivateBio = async () => {
    if (!bioPass.trim()) { setBioError('Ingresa tu contraseña.'); return }
    setBioLoading(true); setBioError(null)
    try {
      await api.post('/auth/verify-password', { password: bioPass.trim() })
      await bio.saveCredentials(user!.username, bioPass.trim())
      setBioEnabled(true); setShowBioModal(false)
    } catch (err: any) {
      const code = err?.response?.data?.code
      setBioError(code === 'USER_INACTIVE' ? 'Tu usuario está desactivado.' : 'Contraseña incorrecta.')
    } finally { setBioLoading(false) }
  }

  // ── PIN ──────────────────────────────────────────────────────────────────────
  const resetPinModal = () => {
    setPinPass(''); setPinPassShow(false); setNewPin(''); setConfirmPin('')
    setPinStep('password'); setPinError(null); setPinLoading(false)
  }

  const openPinModal = (mode: 'create' | 'change') => {
    resetPinModal(); setPinModalMode(mode); setShowPinModal(true)
  }

  const handleVerifyPinPass = async () => {
    if (!pinPass.trim()) { setPinError('Ingresa tu contraseña.'); return }
    setPinLoading(true); setPinError(null)
    try {
      await api.post('/auth/verify-password', { password: pinPass.trim() })
      setPinStep('newpin')
    } catch (err: any) {
      const code = err?.response?.data?.code
      setPinError(code === 'USER_INACTIVE' ? 'Tu usuario está desactivado.' : 'Contraseña incorrecta.')
    } finally { setPinLoading(false) }
  }

  const addNewPinDigit = (d: string) => {
    if (newPin.length >= 4) return
    const next = newPin + d; setNewPin(next); setPinError(null)
    if (next.length === 4) setTimeout(() => setPinStep('confirm'), 300)
  }

  const addConfirmPinDigit = (d: string) => {
    if (confirmPin.length >= 4) return
    const next = confirmPin + d; setConfirmPin(next); setPinError(null)
    if (next.length === 4) setTimeout(() => handleSavePin(next), 100)
  }

  const handleSavePin = async (confirmVal: string) => {
    if (confirmVal !== newPin) {
      setPinError('Los PINs no coinciden.'); setNewPin(''); setConfirmPin(''); setPinStep('newpin'); return
    }
    await pinSvc.savePin(newPin, user!.username, pinPass.trim())
    setPinEnabled(true); setShowPinModal(false); resetPinModal()
    toast.success('PIN configurado correctamente.')
  }

  const handleDisablePin = () => {
    if (confirm('¿Deseas desactivar el acceso con PIN?')) {
      pinSvc.disablePin(); setPinEnabled(false)
      toast.success('PIN desactivado.')
    }
  }

  const PinDots = ({ value }: { value: string }) => (
    <div className="flex gap-4 justify-center my-4">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
          value.length > i ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
        }`} />
      ))}
    </div>
  )

  const PinNumpad = ({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) => (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mx-auto">
      {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
        d === '' ? <div key={i} /> :
        <button key={i} type="button"
          onClick={() => d === '⌫' ? onDelete() : onDigit(d)}
          className="h-14 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-800 text-lg font-semibold transition-all">
          {d}
        </button>
      ))}
    </div>
  )
  const { register: regW, handleSubmit: hsW, watch, reset: resetPwd, setError: setErrW, formState: { errors: errW } } = useForm<PasswordForm>()
  const newPassword = watch('newPassword')

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'U'

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setErrW('confirmPassword', { message: 'Las contraseñas no coinciden.' })
      return
    }
    setSavingPwd(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
        confirmPassword: data.confirmPassword,
      })
      resetPwd()
      toast.success('Contraseña cambiada correctamente.')
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, mustChangePassword: false }, accessToken, refreshToken, capabilities)
      }
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'INVALID_CURRENT_PASSWORD')
        setErrW('currentPassword', { message: 'La contraseña actual es incorrecta.' })
      else
        toast.error(err?.response?.data?.message ?? 'Error al cambiar la contraseña.')
    } finally { setSavingPwd(false) }
  }

  return (
    <><div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gestiona tus datos y seguridad</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{user?.username}</p>
          <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
            <ShieldCheck className="w-3 h-3" />
            {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Datos del perfil */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <User className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">Información de la cuenta</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{user?.username}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seguridad móvil (solo en nativo) */}
      {isNative && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-800">Seguridad</h2>
          </div>
          <div className="divide-y divide-gray-100">

            {/* Biométrico */}
            {bioAvailable && (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bioEnabled ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <BioIcon className={`w-5 h-5 ${bioEnabled ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${bioEnabled ? 'text-gray-900' : 'text-gray-500'}`}>{bioLabel}</p>
                  <p className="text-xs text-gray-400">{bioEnabled ? 'Activo — acceso rápido sin contraseña' : 'Ingresa más rápido sin contraseña'}</p>
                </div>
                <button
                  onClick={() => handleToggleBio(!bioEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${bioEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${bioEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

            {/* PIN */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${pinEnabled ? 'bg-primary-50' : 'bg-gray-50'}`}>
                <Grid3X3 className={`w-5 h-5 ${pinEnabled ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${pinEnabled ? 'text-gray-900' : 'text-gray-500'}`}>PIN de 4 dígitos</p>
                <p className="text-xs text-gray-400">{pinEnabled ? 'Activo — acceso rápido con tu PIN' : 'Crea un PIN para ingresar rápido'}</p>
              </div>
              {pinEnabled ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => openPinModal('change')} className="text-xs text-primary-600 font-medium hover:underline">Cambiar</button>
                  <button
                    onClick={handleDisablePin}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors focus:outline-none">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow translate-x-6 transition-transform" />
                  </button>
                </div>
              ) : (
                <button onClick={() => openPinModal('create')}
                  className="px-3 py-1.5 bg-primary-50 text-primary-600 text-xs font-semibold rounded-lg hover:bg-primary-100 transition-colors">
                  Configurar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <KeyRound className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h2>
        </div>
        <form onSubmit={hsW(onChangePassword)} className="p-5 space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                {...regW('currentPassword', { required: 'Requerido' })}
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowCurrent(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.currentPassword && <p className="text-xs text-red-500 mt-1">{errW.currentPassword.message}</p>}
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                {...regW('newPassword', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.newPassword && <p className="text-xs text-red-500 mt-1">{errW.newPassword.message}</p>}
          </div>

          {/* Confirmar */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                {...regW('confirmPassword', {
                  required: 'Requerido',
                  validate: v => v === newPassword || 'Las contraseñas no coinciden',
                })}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.confirmPassword && <p className="text-xs text-red-500 mt-1">{errW.confirmPassword.message}</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {savingPwd
                ? <><Loader2 className="w-4 h-4 animate-spin" />Cambiando…</>
                : <><KeyRound className="w-4 h-4" />Cambiar contraseña</>}
            </button>
          </div>
        </form>
      </div>

    </div>

      {/* ── Modal biométrico ── */}
      {showBioModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{bioTitle}</h3>
              <button onClick={() => setShowBioModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-gray-500 text-sm mb-4">Confirma tu contraseña para activar el acceso con {bioLabel}.</p>

            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
            <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 mb-3">
              <span className="text-sm text-gray-500">{user?.username}</span>
            </div>

            <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
            <div className="relative mb-3">
              <input type={bioPassShow ? 'text' : 'password'} value={bioPass}
                onChange={e => { setBioPass(e.target.value); setBioError(null) }}
                placeholder="••••••••" autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="button" onClick={() => setBioPassShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {bioPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {bioError && <p className="text-red-500 text-xs mb-3">{bioError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowBioModal(false)} disabled={bioLoading}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleActivateBio} disabled={bioLoading}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {bioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal PIN ── */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {pinModalMode === 'create' ? 'Crear PIN de acceso' : 'Cambiar PIN de acceso'}
              </h3>
              <button onClick={() => { setShowPinModal(false); resetPinModal() }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Paso 1: contraseña */}
            {pinStep === 'password' && (
              <>
                <p className="text-gray-500 text-sm mb-4">Confirma tu contraseña para continuar.</p>
                <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 mb-3">
                  <span className="text-sm text-gray-500">{user?.username}</span>
                </div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
                <div className="relative mb-3">
                  <input type={pinPassShow ? 'text' : 'password'} value={pinPass}
                    onChange={e => { setPinPass(e.target.value); setPinError(null) }}
                    placeholder="••••••••" autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <button type="button" onClick={() => setPinPassShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {pinPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pinError && <p className="text-red-500 text-xs mb-3">{pinError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setShowPinModal(false); resetPinModal() }} disabled={pinLoading}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleVerifyPinPass} disabled={pinLoading}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Siguiente
                  </button>
                </div>
              </>
            )}

            {/* Paso 2: nuevo PIN */}
            {pinStep === 'newpin' && (
              <>
                <p className="text-gray-500 text-sm mb-2 text-center">Elige 4 dígitos para tu PIN de acceso.</p>
                <PinDots value={newPin} />
                {pinError && <p className="text-red-500 text-xs mb-2 text-center">{pinError}</p>}
                <PinNumpad onDigit={addNewPinDigit} onDelete={() => setNewPin(p => p.slice(0,-1))} />
                <button onClick={() => { setShowPinModal(false); resetPinModal() }}
                  className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 text-center">Cancelar</button>
              </>
            )}

            {/* Paso 3: confirmar PIN */}
            {pinStep === 'confirm' && (
              <>
                <p className="text-gray-500 text-sm mb-2 text-center">Ingresa de nuevo los 4 dígitos para confirmar.</p>
                <PinDots value={confirmPin} />
                {pinError && <p className="text-red-500 text-xs mb-2 text-center">{pinError}</p>}
                <PinNumpad onDigit={addConfirmPinDigit} onDelete={() => setConfirmPin(p => p.slice(0,-1))} />
                <button onClick={() => { setNewPin(''); setConfirmPin(''); setPinStep('newpin') }}
                  className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 text-center">Volver a elegir PIN</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
