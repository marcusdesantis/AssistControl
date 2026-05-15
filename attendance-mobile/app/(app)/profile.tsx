import { useAuthStore } from '@/store/authStore'
import { mobileService } from '@/services/mobileService'
import * as biometric from '@/services/biometricService'
import { storage } from '@/utils/storage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert, Platform, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View, Modal,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProfileScreen() {
  const { fullName, employeeCode, email, username, clearAuth } = useAuthStore()

  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled,   setBiometricEnabled]   = useState(false)
  const [biometricType,      setBiometricType]      = useState<biometric.BiometricType>('none')

  // PIN
  const [pinEnabled, setPinEnabled] = useState(false)

  // Modal biométrico — contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password,          setPassword]          = useState('')
  const [showPass,          setShowPass]          = useState(false)
  const [activating,        setActivating]        = useState(false)
  const [passwordError,     setPasswordError]     = useState<string | null>(null)

  // Modal PIN setup (3 pasos: password → newpin → confirm)
  const [showPinModal, setShowPinModal]   = useState(false)
  const [pinModalMode, setPinModalMode]   = useState<'create' | 'change'>('create')
  const [pinStep,      setPinStep]        = useState<'password' | 'newpin' | 'confirm'>('password')
  const [pinPassword,  setPinPassword]    = useState('')
  const [pinShowPass,  setPinShowPass]    = useState(false)
  const [newPin,       setNewPin]         = useState('')
  const [confirmPin,   setConfirmPin]     = useState('')
  const [pinError,     setPinError]       = useState<string | null>(null)
  const [pinLoading,   setPinLoading]     = useState(false)

  useEffect(() => {
    biometric.isBiometricAvailable().then(available => {
      setBiometricAvailable(available)
      if (available) {
        biometric.getBiometricType().then(setBiometricType)
        biometric.isBiometricEnabled().then(setBiometricEnabled)
      }
    })
    storage.getItem('pin_enabled').then(val => setPinEnabled(val === 'true'))
  }, [])

  const biometricIcon  = biometricType === 'facial' ? 'scan-outline' : 'finger-print-outline'
  const biometricLabel = biometricType === 'facial' ? 'Huella/Face ID' : 'Huella digital'
  const biometricTitle = biometricType === 'facial' ? 'Activar Huella/Face ID' : 'Activar huella digital'

  // ── Biométrico ────────────────────────────────────────────
  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      setPassword(''); setPasswordError(null); setShowPass(false)
      setShowPasswordModal(true)
    } else {
      Alert.alert(
        `Desactivar ${biometricLabel}`,
        `¿Deseas desactivar el acceso con ${biometricLabel}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar', style: 'destructive',
            onPress: async () => {
              await biometric.disableBiometric()
              setBiometricEnabled(false)
            },
          },
        ]
      )
    }
  }

  const handleActivateWithPassword = async () => {
    if (!password.trim()) { setPasswordError('Ingresa tu contraseña.'); return }
    if (!username)        { setPasswordError('No se pudo obtener tu usuario. Cierra sesión e inicia de nuevo.'); return }
    setActivating(true); setPasswordError(null)
    try {
      await mobileService.login(username, password.trim())
      await biometric.saveCredentials(username, password.trim())
      setBiometricEnabled(true)
      setShowPasswordModal(false)
    } catch (e: any) {
      const code = e?.response?.data?.code
      setPasswordError(code === 'USER_INACTIVE' ? 'Tu usuario está desactivado.' : 'Contraseña incorrecta. Intenta de nuevo.')
    } finally { setActivating(false) }
  }

  // ── PIN ───────────────────────────────────────────────────
  const resetPinModal = () => {
    setPinPassword(''); setPinShowPass(false)
    setNewPin(''); setConfirmPin('')
    setPinStep('password'); setPinError(null); setPinLoading(false)
  }

  const openPinSetup = (mode: 'create' | 'change' = 'create') => {
    resetPinModal(); setPinModalMode(mode); setShowPinModal(true)
  }

  const handleVerifyPinPassword = async () => {
    if (!pinPassword.trim()) { setPinError('Ingresa tu contraseña.'); return }
    if (!username)           { setPinError('No se pudo obtener tu usuario.'); return }
    setPinLoading(true); setPinError(null)
    try {
      await mobileService.login(username, pinPassword.trim())
      setPinStep('newpin')
    } catch (e: any) {
      const code = e?.response?.data?.code
      setPinError(code === 'USER_INACTIVE' ? 'Tu usuario está desactivado.' : 'Contraseña incorrecta. Intenta de nuevo.')
    } finally { setPinLoading(false) }
  }

  const addNewPinDigit = (d: string) => {
    if (newPin.length >= 4) return
    const next = newPin + d
    setNewPin(next)
    setPinError(null)
    if (next.length === 4) setTimeout(() => setPinStep('confirm'), 300)
  }

  const addConfirmPinDigit = (d: string) => {
    if (confirmPin.length >= 4) return
    const next = confirmPin + d
    setConfirmPin(next)
    setPinError(null)
    if (next.length === 4) setTimeout(() => handleSavePin(next), 100)
  }

  const handleSavePin = async (confirmValue: string) => {
    if (confirmValue !== newPin) {
      setPinError('Los PINs no coinciden. Intenta de nuevo.')
      setNewPin(''); setConfirmPin(''); setPinStep('newpin')
      return
    }
    await storage.setItem('employee_pin',    newPin)
    await storage.setItem('pin_enabled',     'true')
    await storage.setItem('pin_credentials', JSON.stringify({ username, password: pinPassword.trim() }))
    setPinEnabled(true)
    setShowPinModal(false)
    resetPinModal()
  }

  const handleDisablePin = () => {
    Alert.alert('Desactivar PIN', '¿Deseas desactivar el acceso con PIN de 4 dígitos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar', style: 'destructive',
        onPress: async () => {
          await storage.deleteItem('employee_pin')
          await storage.deleteItem('pin_enabled')
          await storage.deleteItem('pin_credentials')
          setPinEnabled(false)
        },
      },
    ])
  }

  // ── Logout ────────────────────────────────────────────────
  const doLogout = async () => {
    await clearAuth()
    router.replace('/(auth)')
  }

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas cerrar sesión?')) doLogout()
      return
    }
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
    ])
  }

  // ── Numpad compartido ──────────────────────────────────────
  const PinNumpad = ({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) => (
    <View style={styles.numpad}>
      {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) =>
        d === '' ? <View key={i} style={styles.numKey} /> :
        <TouchableOpacity key={i} style={styles.numKey} onPress={() => d === '⌫' ? onDelete() : onDigit(d)}>
          <Text style={styles.numText}>{d}</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const PinDots = ({ value }: { value: string }) => (
    <View style={styles.dotsRow}>
      {[0,1,2,3].map(i => <View key={i} style={[styles.dot, value.length > i && styles.dotFilled]} />)}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{fullName?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>

        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.code}>{employeeCode}</Text>

        {/* Info */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#64748b" />
            <Text style={styles.infoLabel}>Correo</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{email ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color="#64748b" />
            <Text style={styles.infoLabel}>Número</Text>
            <Text style={styles.infoValue}>{employeeCode ?? '—'}</Text>
          </View>
        </View>

        {/* Seguridad */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
            <Text style={styles.sectionTitle}>Seguridad</Text>
          </View>

          {/* Biométrico */}
          {biometricAvailable && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name={biometricIcon} size={20} color={biometricEnabled ? '#3b82f6' : '#64748b'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: biometricEnabled ? '#f1f5f9' : '#94a3b8' }]}>
                    {biometricLabel}
                  </Text>
                  <Text style={styles.hint}>
                    {biometricEnabled ? 'Activo — acceso rápido al iniciar sesión' : 'Ingresa más rápido sin contraseña'}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#334155', true: '#1d4ed8' }}
                  thumbColor={biometricEnabled ? '#3b82f6' : '#64748b'}
                />
              </View>
            </>
          )}

          {/* PIN */}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="keypad-outline" size={20} color={pinEnabled ? '#3b82f6' : '#64748b'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: pinEnabled ? '#f1f5f9' : '#94a3b8' }]}>
                PIN de 4 dígitos
              </Text>
              <Text style={styles.hint}>
                {pinEnabled ? 'Activo — acceso rápido con tu PIN' : 'Crea un PIN para ingresar rápido'}
              </Text>
            </View>
            {pinEnabled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => openPinSetup('change')}>
                  <Text style={styles.changePinLink}>Cambiar</Text>
                </TouchableOpacity>
                <Switch
                  value={true}
                  onValueChange={() => handleDisablePin()}
                  trackColor={{ false: '#334155', true: '#1d4ed8' }}
                  thumbColor="#3b82f6"
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.setupBtn} onPress={() => openPinSetup('create')}>
                <Text style={styles.setupBtnText}>Configurar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TiempoYa v1.0.0</Text>
      </View>

      {/* ── Modal biométrico — confirmar contraseña ── */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name={biometricIcon} size={30} color="#3b82f6" />
              </View>
              <Text style={styles.modalTitle}>{biometricTitle}</Text>
              <Text style={styles.modalSubtitle}>Confirma tu contraseña para activar el acceso con {biometricLabel}.</Text>
            </View>

            <Text style={styles.modalLabel}>Usuario</Text>
            <View style={styles.modalInputDisabled}>
              <Text style={styles.modalInputDisabledText}>{username ?? '—'}</Text>
            </View>

            <Text style={styles.modalLabel}>Contraseña</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.modalInput, styles.inputFlex]}
                placeholder="••••••••" placeholderTextColor="#475569"
                value={password} onChangeText={t => { setPassword(t); setPasswordError(null) }}
                secureTextEntry={!showPass} autoCapitalize="none" autoFocus
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {passwordError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)} disabled={activating}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnConfirm, activating && { opacity: 0.6 }]} onPress={handleActivateWithPassword} disabled={activating}>
                {activating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnConfirmText}>Activar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal PIN setup ── */}
      <Modal visible={showPinModal} transparent animationType="slide" onRequestClose={() => { setShowPinModal(false); resetPinModal() }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Paso 1: contraseña */}
            {pinStep === 'password' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="keypad-outline" size={30} color="#3b82f6" />
                  </View>
                  <Text style={styles.modalTitle}>{pinModalMode === 'create' ? 'Crear PIN de acceso' : 'Cambiar PIN de acceso'}</Text>
                  <Text style={styles.modalSubtitle}>Confirma tu contraseña para continuar.</Text>
                </View>

                <Text style={styles.modalLabel}>Usuario</Text>
                <View style={styles.modalInputDisabled}>
                  <Text style={styles.modalInputDisabledText}>{username ?? '—'}</Text>
                </View>

                <Text style={styles.modalLabel}>Contraseña</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.modalInput, styles.inputFlex]}
                    placeholder="••••••••" placeholderTextColor="#475569"
                    value={pinPassword} onChangeText={t => { setPinPassword(t); setPinError(null) }}
                    secureTextEntry={!pinShowPass} autoCapitalize="none" autoFocus
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setPinShowPass(v => !v)}>
                    <Ionicons name={pinShowPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {pinError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{pinError}</Text>
                  </View>
                )}

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowPinModal(false); resetPinModal() }} disabled={pinLoading}>
                    <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtnConfirm, pinLoading && { opacity: 0.6 }]} onPress={handleVerifyPinPassword} disabled={pinLoading}>
                    {pinLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnConfirmText}>Siguiente</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Paso 2: nuevo PIN */}
            {pinStep === 'newpin' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="keypad-outline" size={30} color="#3b82f6" />
                  </View>
                  <Text style={styles.modalTitle}>Crea tu PIN</Text>
                  <Text style={styles.modalSubtitle}>Elige 4 dígitos para tu PIN de acceso.</Text>
                </View>
                <PinDots value={newPin} />
                {pinError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{pinError}</Text>
                  </View>
                )}
                <PinNumpad onDigit={addNewPinDigit} onDelete={() => setNewPin(p => p.slice(0, -1))} />
                <TouchableOpacity style={styles.modalLinkBtn} onPress={() => { setShowPinModal(false); resetPinModal() }}>
                  <Text style={styles.modalLinkText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Paso 3: confirmar PIN */}
            {pinStep === 'confirm' && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrap}>
                    <Ionicons name="checkmark-circle-outline" size={30} color="#3b82f6" />
                  </View>
                  <Text style={styles.modalTitle}>Confirma tu PIN</Text>
                  <Text style={styles.modalSubtitle}>Ingresa de nuevo los 4 dígitos para confirmar.</Text>
                </View>
                <PinDots value={confirmPin} />
                {pinError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{pinError}</Text>
                  </View>
                )}
                <PinNumpad onDigit={addConfirmPinDigit} onDelete={() => setConfirmPin(p => p.slice(0, -1))} />
                <TouchableOpacity style={styles.modalLinkBtn} onPress={() => { setNewPin(''); setConfirmPin(''); setPinStep('newpin') }}>
                  <Text style={styles.modalLinkText}>Volver a elegir PIN</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0f172a' },
  container:    { flex: 1, alignItems: 'center', padding: 24 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  name:       { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  code:       { fontSize: 14, color: '#64748b', marginBottom: 20 },

  card: {
    width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  divider:       { height: 1, backgroundColor: '#334155' },
  infoLabel:     { fontSize: 13, color: '#94a3b8' },
  infoValue:     { flex: 1, fontSize: 14, color: '#f1f5f9', fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  hint:          { fontSize: 11, color: '#475569', marginTop: 2 },

  setupBtn:      { backgroundColor: '#1e3a5f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  setupBtnText:  { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
  changePinLink: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14, width: '100%', justifyContent: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  version:    { color: '#334155', fontSize: 12, marginTop: 'auto', paddingBottom: 8 },

  // PIN numpad
  dotsRow: { flexDirection: 'row', gap: 16, marginVertical: 16 },
  dot:      { width: 14, height: 14, borderRadius: 7, backgroundColor: '#334155' },
  dotFilled:{ backgroundColor: '#3b82f6' },
  numpad:   { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, marginVertical: 8 },
  numKey:   {
    width: 68, height: 68, borderRadius: 18,
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  numText:  { color: '#f1f5f9', fontSize: 22, fontWeight: '600' },

  // Modales
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40, alignItems: 'center',
  },
  modalHeader:   { alignItems: 'center', marginBottom: 16 },
  modalIconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  modalLabel:    { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12, alignSelf: 'flex-start', width: '100%' },
  modalInputDisabled: {
    backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1,
    borderColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 12, width: '100%',
  },
  modalInputDisabledText: { color: '#475569', fontSize: 14 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', width: '100%' },
  modalInput: {
    backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1,
    borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#f1f5f9',
  },
  inputFlex: { flex: 1 },
  eyeBtn:    { position: 'absolute', right: 14, padding: 4 },
  errorBox:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#450a0a', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, width: '100%',
  },
  errorText: { color: '#fca5a5', fontSize: 12, flex: 1 },
  modalBtnRow:         { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  modalBtnCancel:      { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  modalBtnCancelText:  { color: '#64748b', fontSize: 15, fontWeight: '600' },
  modalBtnConfirm:     { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#2563eb' },
  modalBtnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalLinkBtn:        { paddingVertical: 12 },
  modalLinkText:       { color: '#475569', fontSize: 13 },
})
