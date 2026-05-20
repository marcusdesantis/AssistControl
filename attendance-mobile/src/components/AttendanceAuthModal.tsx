import * as biometric from '@/services/biometricService'
import { storage } from '@/utils/storage'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

export type AuthMethod = 'biometric' | 'pin'
type Mode = 'select' | 'pin'

interface Props {
  visible:     boolean
  action:      'checkin' | 'checkout'
  initialMode?: AuthMethod        // si viene → va directo, sin pantalla de selección
  onSuccess:   (method: AuthMethod) => void
  onCancel:    () => void
}

export default function AttendanceAuthModal({ visible, action, initialMode, onSuccess, onCancel }: Props) {
  const [bioEnabled,  setBioEnabled]  = useState(false)
  const [pinEnabled,  setPinEnabled]  = useState(false)
  const [bioType,     setBioType]     = useState<biometric.BiometricType>('fingerprint')
  const [mode,        setMode]        = useState<Mode>('select')
  const [pin,         setPin]         = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [bioLoading,  setBioLoading]  = useState(false)

  const actionLabel = action === 'checkin' ? 'entrada' : 'salida'

  useEffect(() => {
    if (!visible) return
    setPin(''); setError(null); setBioLoading(false)

    Promise.all([
      biometric.isBiometricEnabled(),
      storage.getItem('pin_enabled'),
      biometric.getBiometricType(),
    ]).then(([bio, pinVal, type]) => {
      setBioEnabled(bio)
      setPinEnabled(pinVal === 'true')
      setBioType(type)

      // Determinar el modo inicial
      const target = initialMode
        ?? (bio && !pinVal ? 'biometric' : (!bio && pinVal === 'true' ? 'pin' : null))

      if (target === 'biometric') {
        setMode('select')
        triggerBiometric()
      } else if (target === 'pin') {
        setMode('pin')
      } else {
        setMode('select') // selección manual (primera vez con ambos)
      }
    })
  }, [visible, initialMode])

  const triggerBiometric = async () => {
    setBioLoading(true)
    setError(null)
    try {
      const ok = await biometric.authenticate(`Confirma tu ${actionLabel}`)
      if (ok) {
        onSuccess('biometric')
      } else {
        setError('Autenticación biométrica cancelada.')
        setBioLoading(false)
      }
    } catch {
      setError('Error al autenticar. Intenta con PIN.')
      setBioLoading(false)
    }
  }

  const addDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(null)
    if (next.length === 4) verifyPin(next)
  }

  const removeDigit = () => setPin(p => p.slice(0, -1))

  const verifyPin = async (entered: string) => {
    const stored = await storage.getItem('employee_pin')
    if (entered === stored) {
      onSuccess('pin')
    } else {
      setPin('')
      setError('PIN incorrecto. Intenta de nuevo.')
    }
  }

  const bioLabel = bioType === 'facial' ? 'Face ID' : 'Huella digital'
  const bioIcon  = bioType === 'facial' ? 'scan-outline' : 'finger-print-outline'
  const DIGITS   = ['1','2','3','4','5','6','7','8','9','','0','del']

  // Mostrar tabs solo en selección manual (primera vez / al cambiar)
  const showTabs = bioEnabled && pinEnabled && !initialMode

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Confirma tu {actionLabel}</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Tabs — solo cuando se está eligiendo por primera vez o cambiando */}
          {showTabs && (
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, mode !== 'pin' && s.tabActive]}
                onPress={() => { setMode('select'); setError(null); setPin('') }}
              >
                <Ionicons name={bioIcon as any} size={16} color={mode !== 'pin' ? '#fff' : '#64748b'} />
                <Text style={[s.tabText, mode !== 'pin' && s.tabTextActive]}>{bioLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, mode === 'pin' && s.tabActive]}
                onPress={() => { setMode('pin'); setError(null); setPin('') }}
              >
                <Ionicons name="keypad-outline" size={16} color={mode === 'pin' ? '#fff' : '#64748b'} />
                <Text style={[s.tabText, mode === 'pin' && s.tabTextActive]}>PIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#fca5a5" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Modo biométrico */}
          {mode === 'select' && bioEnabled && (
            <View style={s.bioSection}>
              <TouchableOpacity
                style={s.bioBtn}
                onPress={triggerBiometric}
                disabled={bioLoading}
                activeOpacity={0.75}
              >
                {bioLoading
                  ? <ActivityIndicator color="#fff" size="large" />
                  : <Ionicons name={bioIcon as any} size={52} color="#fff" />
                }
              </TouchableOpacity>
              <Text style={s.bioHint}>
                {bioLoading ? 'Esperando...' : `Toca para usar ${bioLabel}`}
              </Text>
            </View>
          )}

          {/* Modo PIN */}
          {mode === 'pin' && (
            <View style={s.pinSection}>
              <View style={s.dots}>
                {[0,1,2,3].map(i => (
                  <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />
                ))}
              </View>
              <View style={s.numpad}>
                {DIGITS.map((d, i) => {
                  if (d === '') return <View key={i} style={s.numKey} />
                  if (d === 'del') return (
                    <TouchableOpacity key={i} style={s.numKey} onPress={removeDigit} activeOpacity={0.6}>
                      <Ionicons name="backspace-outline" size={22} color="#94a3b8" />
                    </TouchableOpacity>
                  )
                  return (
                    <TouchableOpacity key={i} style={s.numKey} onPress={() => addDigit(d)} activeOpacity={0.6}>
                      <Text style={s.numText}>{d}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#334155' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  title:         { fontSize: 17, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize' },
  tabs:          { flexDirection: 'row', margin: 16, backgroundColor: '#0f172a', borderRadius: 10, padding: 3 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8 },
  tabActive:     { backgroundColor: '#1e40af' },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#450a0a', marginHorizontal: 16, borderRadius: 10, padding: 10, marginBottom: 4 },
  errorText:     { color: '#fca5a5', fontSize: 13, flex: 1 },
  bioSection:    { alignItems: 'center', paddingVertical: 28 },
  bioBtn:        { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  bioHint:       { color: '#94a3b8', fontSize: 14 },
  pinSection:    { alignItems: 'center', paddingTop: 20 },
  dots:          { flexDirection: 'row', gap: 16, marginBottom: 28 },
  dot:           { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#475569', backgroundColor: 'transparent' },
  dotFilled:     { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  numpad:        { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center' },
  numKey:        { width: 80, height: 64, alignItems: 'center', justifyContent: 'center' },
  numText:       { fontSize: 24, fontWeight: '600', color: '#f1f5f9' },
  cancelBtn:     { marginHorizontal: 16, marginTop: 12, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  cancelText:    { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
})
