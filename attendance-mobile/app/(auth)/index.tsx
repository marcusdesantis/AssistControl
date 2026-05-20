import { mobileService, type LoginResult } from '@/services/mobileService'
import * as biometric from '@/services/biometricService'
import { useAuthStore } from '@/store/authStore'
import { storage } from '@/utils/storage'
import { registerForPushNotifications } from '@/utils/notifications'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type LoginMethod = 'user' | 'biometric' | 'pin'

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth)

  const [method,      setMethod]      = useState<LoginMethod>('user')
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [pin,         setPin]         = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Biométrico
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricHardware,  setBiometricHardware]  = useState(false)
  const [biometricEnabled,   setBiometricEnabled]   = useState(false)
  const [biometricType,      setBiometricType]      = useState<biometric.BiometricType>('none')
  const [pinEnabled,         setPinEnabled]         = useState(false)

  // Modales
  const [showBiometricOffer, setShowBiometricOffer] = useState(false)
  const [showBiometricInfo,  setShowBiometricInfo]  = useState(false)
  const [userInactiveModal,  setUserInactiveModal]  = useState(false)
  const [mobileNotAllowed,   setMobileNotAllowed]   = useState(false)
  const [pinForgotInfo,      setPinForgotInfo]      = useState(false)

  // Guardamos resultado del login y credenciales para completar DESPUÉS del modal
  const [pendingAuth,        setPendingAuth]        = useState<{ result: LoginResult; username: string } | null>(null)
  const [pendingCredentials, setPendingCredentials] = useState<{ username: string; password: string } | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    storage.getItem('login_notice').then((notice) => {
      if (notice === 'user_inactive') {
        storage.deleteItem('login_notice')
        setUserInactiveModal(true)
      } else if (notice === 'mobile_not_allowed') {
        storage.deleteItem('login_notice')
        setMobileNotAllowed(true)
      }
    })

    biometric.hasBiometricHardware().then(hasHw => {
      setBiometricHardware(hasHw)
      if (hasHw) biometric.getBiometricType().then(setBiometricType)
    })

    biometric.isBiometricAvailable().then(available => {
      setBiometricAvailable(available)
      if (available) {
        biometric.isBiometricEnabled().then(enabled => {
          setBiometricEnabled(enabled)
          if (enabled) setMethod('biometric')
        })
      }
    })

    storage.getItem('pin_enabled').then(val => {
      if (val === 'true') setPinEnabled(true)
    })
  }, [])

  useEffect(() => {
    fadeAnim.setValue(0)
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
  }, [method])

  // ── Completar login: setAuth + push + navegar ────────────────────────────────
  const completeLogin = async (result: LoginResult, u: string) => {
    // Si el usuario cambió, limpiar credenciales biométricas y PIN del usuario anterior
    const storedBioUser = await biometric.getStoredCredentialUsername()
    if (storedBioUser && storedBioUser !== u) {
      await biometric.disableBiometric()
      setBiometricEnabled(false)
    }
    const pinCredsRaw = await storage.getItem('pin_credentials')
    if (pinCredsRaw) {
      try {
        const { username: pinUser } = JSON.parse(pinCredsRaw)
        if (pinUser !== u) {
          await storage.deleteItem('employee_pin')
          await storage.deleteItem('pin_enabled')
          await storage.deleteItem('pin_credentials')
          setPinEnabled(false)
        }
      } catch { /* ignorar */ }
    }
    await setAuth({
      token:        result.token,
      employeeId:   result.employeeId,
      employeeCode: result.employeeCode,
      fullName:     result.fullName,
      email:        result.email,
      username:     u,
      hasSchedule:  result.hasSchedule,
      companyName:  result.companyName,
      logoBase64:   result.logoBase64 ?? null,
      logoUrl:      result.logoUrl    ?? null,
    })
    registerForPushNotifications().then(t => {
      if (t) mobileService.updatePushToken(t).catch(() => {})
    })
    router.replace('/(app)')
  }

  // ── Biometric / PIN login (ya autenticado, sin offer) ───────────────────────
  const doLogin = async (u: string, p: string) => {
    const result = await mobileService.login(u, p)
    await completeLogin(result, u)
  }

  // ── Login con usuario y contraseña ──────────────────────────────────────────
  const handleUserLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setLoading(true); setError(null)
    try {
      const u      = username.trim().toLowerCase()
      const p      = password.trim()
      const result = await mobileService.login(u, p)

      // Si hay biométrico real disponible (enrollado) y no está activado → mostrar offer ANTES de setAuth
      if (biometricAvailable && !biometricEnabled) {
        setPendingAuth({ result, username: u })
        setPendingCredentials({ username: u, password: p })
        setShowBiometricOffer(true)
      } else {
        await completeLogin(result, u)
      }
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE')          setUserInactiveModal(true)
      else if (code === 'MOBILE_NOT_ALLOWED') setMobileNotAllowed(true)
      else setError(e?.response?.data?.message ?? 'Error al iniciar sesión.')
    } finally { setLoading(false) }
  }

  // ── Biometric login ──────────────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    setLoading(true); setError(null)
    try {
      const creds = await biometric.getCredentials()
      if (!creds) { setLoading(false); return }
      await doLogin(creds.username, creds.password)
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE')          setUserInactiveModal(true)
      else if (code === 'MOBILE_NOT_ALLOWED') setMobileNotAllowed(true)
      else {
        setError('Sesión expirada. Ingresa tu usuario y contraseña.')
        biometric.disableBiometric()
        setBiometricEnabled(false)
        setMethod('user')
      }
    } finally { setLoading(false) }
  }

  // ── PIN login ────────────────────────────────────────────────────────────────
  const handlePinLoginDirect = async (p: string) => {
    setLoading(true); setError(null)
    try {
      const storedPin = await storage.getItem('employee_pin')
      if (p !== storedPin) { setError('PIN incorrecto.'); setPin(''); setLoading(false); return }
      const creds = await storage.getItem('pin_credentials')
      if (!creds) { setError('Sesión expirada. Usa usuario y contraseña.'); setPin(''); setLoading(false); return }
      const { username: u, password: pw } = JSON.parse(creds)
      await doLogin(u, pw)
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE')          setUserInactiveModal(true)
      else if (code === 'MOBILE_NOT_ALLOWED') setMobileNotAllowed(true)
      else { setError('Sesión expirada. Usa usuario y contraseña.'); setPin(''); setMethod('user') }
    } finally { setLoading(false) }
  }

  const addPinDigit = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError(null)
    if (next.length === 4) setTimeout(() => handlePinLoginDirect(next), 100)
  }

  // ── Offer: activar biométrico ────────────────────────────────────────────────
  const handleActivateBiometric = async () => {
    if (!pendingCredentials || !pendingAuth) return
    setShowBiometricOffer(false)
    try {
      await biometric.saveCredentials(pendingCredentials.username, pendingCredentials.password)
      setBiometricEnabled(true)
    } catch { /* cancelado */ }
    const { result, username: u } = pendingAuth
    setPendingAuth(null); setPendingCredentials(null)
    await completeLogin(result, u)
  }

  const handleDeclineBiometric = () => {
    setShowBiometricOffer(false)
    setShowBiometricInfo(true)
  }

  const handleBiometricInfoClose = async () => {
    setShowBiometricInfo(false)
    if (pendingAuth) {
      const { result, username: u } = pendingAuth
      setPendingAuth(null); setPendingCredentials(null)
      await completeLogin(result, u)
    }
  }

  const biometricIcon  = biometricType === 'facial' ? 'scan-outline' : 'finger-print-outline'
  const biometricLabel = biometricType === 'facial' ? 'Huella/Face ID' : 'huella digital'

  const methods: { key: LoginMethod; icon: any; label: string; show: boolean }[] = [
    { key: 'user',      icon: 'person-outline',  label: 'Usuario', show: true },
    { key: 'biometric', icon: biometricIcon,      label: biometricType === 'facial' ? 'Huella/Face ID' : 'Huella', show: biometricAvailable && biometricEnabled },
    { key: 'pin',       icon: 'keypad-outline',   label: 'PIN',     show: pinEnabled },
  ].filter(m => m.show)

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../login-logo.png')}
            style={styles.loginLogo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Acceso para empleados</Text>
        </View>

        {/* Selector de método */}
        {methods.length > 1 && (
          <View style={styles.methodRow}>
            {methods.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodCard, method === m.key && styles.methodCardActive]}
                onPress={() => { setMethod(m.key); setError(null); setPin('') }}
              >
                <Ionicons name={m.icon} size={28} color={method === m.key ? '#fff' : '#64748b'} />
                <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>{m.label}</Text>
                {method === m.key && <View style={styles.methodDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Animated.View style={[styles.formWrap, { opacity: fadeAnim }]}>

          {/* ── Usuario y contraseña ── */}
          {method === 'user' && (
            <View style={styles.form}>
              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu usuario"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleUserLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Iniciar sesión</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Huella / Face ID ── */}
          {method === 'biometric' && (
            <View style={styles.biometricBox}>
              <TouchableOpacity style={styles.biometricCircle} onPress={handleBiometricLogin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#3b82f6" size="large" />
                  : <Ionicons name={biometricIcon} size={56} color="#3b82f6" />
                }
              </TouchableOpacity>
              <Text style={styles.biometricHint}>
                {biometricType === 'facial' ? 'Toca para escanear' : 'Toca para leer tu huella'}
              </Text>
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => { setMethod('user'); setError(null) }}>
                <Text style={styles.altLink}>Usar usuario y contraseña</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PIN ── */}
          {method === 'pin' && (
            <View style={styles.pinBox}>
              <Text style={styles.pinTitle}>Ingresa tu PIN</Text>
              <View style={styles.dotsRow}>
                {[0,1,2,3].map(i => (
                  <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
                ))}
              </View>
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <View style={styles.numpad}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  d === '' ? <View key={i} style={styles.numKey} /> :
                  <TouchableOpacity
                    key={i}
                    style={styles.numKey}
                    onPress={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : addPinDigit(d)}
                    disabled={loading}
                  >
                    {loading && d !== '⌫'
                      ? <ActivityIndicator color="#3b82f6" size="small" />
                      : <Text style={styles.numText}>{d}</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => { setPinForgotInfo(true) }}>
                <Text style={styles.forgotPin}>¿Olvidaste tu PIN?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMethod('user'); setError(null); setPin('') }}>
                <Text style={styles.altLink}>Usar usuario y contraseña</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <Text style={styles.footer}>
          Tu usuario y contraseña los encontrarás en el correo de invitación o pídelos a tu administrador.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: ofrecer biométrico tras login ── */}
      <Modal visible={showBiometricOffer} transparent animationType="fade" onRequestClose={handleDeclineBiometric}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e3a5f' }]}>
              <Ionicons name={biometricIcon} size={36} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>
              {biometricType === 'facial' ? 'Activar Huella/Face ID' : 'Activar huella digital'}
            </Text>
            <Text style={styles.modalBody}>
              {biometricType === 'facial'
                ? 'La próxima vez podrás ingresar con tu cara, sin escribir tu contraseña.'
                : 'La próxima vez podrás ingresar con tu huella digital, sin escribir tu contraseña.'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleActivateBiometric}>
              <Text style={styles.modalBtnText}>Activar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleDeclineBiometric}>
              <Text style={styles.modalBtnSecondaryText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: info tras rechazar biométrico ── */}
      <Modal visible={showBiometricInfo} transparent animationType="fade" onRequestClose={handleBiometricInfoClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e293b' }]}>
              <Ionicons name={biometricIcon} size={36} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>Sin problema</Text>
            <Text style={styles.modalBody}>
              Puedes activar el acceso con <Text style={{ color: '#3b82f6', fontWeight: '700' }}>{biometricLabel}</Text> en cualquier momento desde tu <Text style={{ color: '#3b82f6', fontWeight: '700' }}>Perfil</Text>.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleBiometricInfoClose}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: olvidé mi PIN ── */}
      <Modal visible={pinForgotInfo} transparent animationType="fade" onRequestClose={() => setPinForgotInfo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e3a5f' }]}>
              <Ionicons name="keypad-outline" size={36} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>¿Olvidaste tu PIN?</Text>
            <Text style={styles.modalBody}>
              Ingresa con tu <Text style={{ color: '#3b82f6', fontWeight: '700' }}>usuario y contraseña</Text>. Luego puedes cambiar tu PIN desde tu <Text style={{ color: '#3b82f6', fontWeight: '700' }}>Perfil</Text>.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => { setPinForgotInfo(false); setMethod('user'); setError(null); setPin('') }}
            >
              <Text style={styles.modalBtnText}>Ir a usuario y contraseña</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setPinForgotInfo(false)}>
              <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: usuario desactivado ── */}
      <Modal visible={userInactiveModal} transparent animationType="fade" onRequestClose={() => setUserInactiveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-remove-outline" size={36} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Usuario desactivado</Text>
            <Text style={styles.modalBody}>Tu usuario ha sido desactivado. Contacta con tu empresa.</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f59e0b' }]} onPress={() => setUserInactiveModal(false)}>
              <Text style={[styles.modalBtnText, { color: '#000' }]}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: sin acceso móvil ── */}
      <Modal visible={mobileNotAllowed} transparent animationType="fade" onRequestClose={() => setMobileNotAllowed(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e1b4b' }]}>
              <Ionicons name="phone-portrait-outline" size={36} color="#818cf8" />
            </View>
            <Text style={styles.modalTitle}>Sin acceso a la app</Text>
            <Text style={styles.modalBody}>El plan de tu empresa no incluye acceso móvil.</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#4f46e5' }]} onPress={() => setMobileNotAllowed(false)}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f172a' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },

  header:     { alignItems: 'center', marginBottom: 32 },
  loginLogo:  { width: 200, height: 120, marginBottom: 12 },
  subtitle:   { fontSize: 13, color: '#64748b' },

  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  methodCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e293b', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#334155',
    paddingVertical: 18, gap: 6, position: 'relative',
  },
  methodCardActive: {
    backgroundColor: '#1e3a5f', borderColor: '#2563eb',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  methodLabel:       { fontSize: 11, fontWeight: '600', color: '#64748b' },
  methodLabelActive: { color: '#fff' },
  methodDot: {
    position: 'absolute', bottom: 8,
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#3b82f6',
  },

  formWrap: {},

  form:     { backgroundColor: '#1e293b', borderRadius: 18, padding: 22, gap: 4 },
  label:    { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 10, marginBottom: 4 },
  input:    {
    backgroundColor: '#0f172a', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#f1f5f9', borderWidth: 1, borderColor: '#334155',
  },
  inputRow:  { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1 },
  eyeBtn:    { position: 'absolute', right: 14, padding: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#450a0a', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 10,
  },
  errorText: { color: '#fca5a5', fontSize: 13, flex: 1 },
  btn:        { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  biometricBox: { alignItems: 'center', paddingVertical: 16, gap: 16 },
  biometricCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  biometricHint: { color: '#64748b', fontSize: 14 },
  altLink:       { color: '#3b82f6', fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  forgotPin:     { color: '#475569', fontSize: 12, paddingVertical: 4 },

  pinBox:    { alignItems: 'center', gap: 16, paddingVertical: 8 },
  pinTitle:  { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  dotsRow:   { flexDirection: 'row', gap: 16 },
  dot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: '#334155' },
  dotFilled: { backgroundColor: '#3b82f6' },
  numpad:    { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12 },
  numKey:    {
    width: 68, height: 68, borderRadius: 18,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#f1f5f9', fontSize: 22, fontWeight: '600' },

  footer: { textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 24 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#1e293b', borderRadius: 22,
    padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#451a03', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle:           { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 10, textAlign: 'center' },
  modalBody:            { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBtn:             { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center', width: '100%', marginBottom: 10 },
  modalBtnText:         { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBtnSecondary:    { paddingVertical: 10, alignItems: 'center', width: '100%' },
  modalBtnSecondaryText:{ color: '#475569', fontSize: 14 },
})
