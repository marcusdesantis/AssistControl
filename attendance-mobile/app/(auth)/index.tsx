import { mobileService } from '@/services/mobileService'
import * as biometric from '@/services/biometricService'
import { useAuthStore } from '@/store/authStore'
import { storage } from '@/utils/storage'
import { registerForPushNotifications } from '@/utils/notifications'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username,          setUsername]          = useState('')
  const [password,          setPassword]          = useState('')
  const [showPass,          setShowPass]          = useState(false)
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [userInactiveModal, setUserInactiveModal] = useState(false)
  const [mobileNotAllowed,  setMobileNotAllowed]  = useState(false)

  // Biométrico
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled,   setBiometricEnabled]   = useState(false)
  const [biometricType,      setBiometricType]      = useState<biometric.BiometricType>('none')
  const [showBiometricOffer, setShowBiometricOffer] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{ username: string; password: string } | null>(null)

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

    // Verificar disponibilidad biométrica
    biometric.isBiometricAvailable().then(available => {
      setBiometricAvailable(available)
      if (available) {
        biometric.getBiometricType().then(setBiometricType)
        biometric.isBiometricEnabled().then(setBiometricEnabled)
      }
    })
  }, [])

  const doLogin = async (u: string, p: string) => {
    const result = await mobileService.login(u, p)
    await setAuth({
      token:        result.token,
      employeeId:   result.employeeId,
      employeeCode: result.employeeCode,
      fullName:     result.fullName,
      email:        result.email,
      hasSchedule:  result.hasSchedule,
      companyName:  result.companyName,
      logoBase64:   result.logoBase64 ?? null,
      logoUrl:      result.logoUrl    ?? null,
    })
    registerForPushNotifications().then((pushToken) => {
      if (pushToken) mobileService.updatePushToken(pushToken).catch(() => {})
    })
    return result
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await doLogin(username.trim().toLowerCase(), password.trim())
      // Si biométrico disponible y no está activado, ofrecer activarlo
      if (biometricAvailable && !biometricEnabled) {
        setPendingCredentials({ username: username.trim().toLowerCase(), password: password.trim() })
        setShowBiometricOffer(true)
      } else {
        router.replace('/(app)')
      }
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE') {
        setUserInactiveModal(true)
      } else if (code === 'MOBILE_NOT_ALLOWED') {
        setMobileNotAllowed(true)
      } else {
        setError(e?.response?.data?.message ?? e?.message ?? 'Error al iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Login automático con biométrico
  const handleBiometricLogin = async () => {
    try {
      const creds = await biometric.getCredentials()
      if (!creds) return // cancelado por el usuario
      setLoading(true)
      setError(null)
      await doLogin(creds.username, creds.password)
      router.replace('/(app)')
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE') {
        setUserInactiveModal(true)
      } else if (code === 'MOBILE_NOT_ALLOWED') {
        setMobileNotAllowed(true)
      } else {
        setError('Sesión expirada. Ingresa tu usuario y contraseña.')
        // Limpiar credenciales biométricas si el login falla
        biometric.disableBiometric()
        setBiometricEnabled(false)
      }
    } finally {
      setLoading(false)
    }
  }

  // Activar biométrico tras login exitoso
  const handleActivateBiometric = async () => {
    if (!pendingCredentials) return
    setShowBiometricOffer(false)
    try {
      await biometric.saveCredentials(pendingCredentials.username, pendingCredentials.password)
      setBiometricEnabled(true)
    } catch {
      // Usuario canceló la verificación biométrica — continuar igual
    }
    setPendingCredentials(null)
    router.replace('/(app)')
  }

  const handleDeclineBiometric = () => {
    setShowBiometricOffer(false)
    setPendingCredentials(null)
    router.replace('/(app)')
  }

  const biometricIcon = biometricType === 'facial' ? 'scan-outline' : 'finger-print-outline'
  const biometricLabel = biometricType === 'facial' ? 'Ingresar con Face ID' : 'Ingresar con huella digital'
  const biometricOfferTitle = biometricType === 'facial' ? 'Activar Face ID' : 'Activar huella digital'
  const biometricOfferBody  = biometricType === 'facial'
    ? 'La próxima vez podrás ingresar con tu cara, sin escribir tu contraseña.'
    : 'La próxima vez podrás ingresar con tu huella digital, sin escribir tu contraseña.'

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>TiempoYa</Text>
          <Text style={styles.subtitle}>Acceso para empleados</Text>
        </View>

        {/* Botón biométrico — solo si está habilitado */}
        {biometricAvailable && biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Ionicons name={biometricIcon} size={32} color="#3b82f6" />
            <Text style={styles.biometricText}>{biometricLabel}</Text>
          </TouchableOpacity>
        )}

        {/* Formulario */}
        <View style={styles.form}>
          {biometricEnabled && (
            <Text style={styles.orText}>— o ingresa con tu contraseña —</Text>
          )}

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
          <View style={styles.pinRow}>
            <TextInput
              style={[styles.input, styles.pinInput]}
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

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Iniciar sesión</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Tu usuario y contraseña los encontrarás en el correo de invitación o pídelos a tu administrador.
        </Text>
      </KeyboardAvoidingView>

      {/* Modal: ofrecer activar biométrico */}
      <Modal visible={showBiometricOffer} transparent animationType="fade" onRequestClose={handleDeclineBiometric}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e3a5f' }]}>
              <Ionicons name={biometricIcon} size={36} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>{biometricOfferTitle}</Text>
            <Text style={styles.modalBody}>{biometricOfferBody}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleActivateBiometric}>
              <Text style={styles.modalBtnText}>Activar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleDeclineBiometric}>
              <Text style={styles.modalBtnSecondaryText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: usuario desactivado */}
      <Modal visible={userInactiveModal} transparent animationType="fade" onRequestClose={() => setUserInactiveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-remove-outline" size={36} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Usuario desactivado</Text>
            <Text style={styles.modalBody}>
              Tu usuario ha sido desactivado por el administrador. Contacta con tu empresa para más información.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setUserInactiveModal(false)}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: plan sin acceso a app móvil */}
      <Modal visible={mobileNotAllowed} transparent animationType="fade" onRequestClose={() => setMobileNotAllowed(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#1e1b4b' }]}>
              <Ionicons name="phone-portrait-outline" size={36} color="#818cf8" />
            </View>
            <Text style={styles.modalTitle}>Sin acceso a la app</Text>
            <Text style={styles.modalBody}>
              El plan de tu empresa no incluye acceso a la aplicación móvil. Contacta con el administrador para más información.
            </Text>
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
  safe:        { flex: 1, backgroundColor: '#0f172a' },
  container:   { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header:      { alignItems: 'center', marginBottom: 28 },
  iconCircle:  {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title:       { fontSize: 28, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  subtitle:    { fontSize: 14, color: '#94a3b8' },

  // Botón biométrico
  biometricBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#3b82f6',
    borderRadius: 16, paddingVertical: 20,
    marginBottom: 16, gap: 8,
  },
  biometricText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },

  form:        { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, gap: 4 },
  orText:      { textAlign: 'center', color: '#475569', fontSize: 12, marginBottom: 8 },
  label:       { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 4 },
  input:       {
    backgroundColor: '#0f172a',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#f1f5f9', borderWidth: 1, borderColor: '#334155',
  },
  pinRow:      { flexDirection: 'row', alignItems: 'center' },
  pinInput:    { flex: 1 },
  eyeBtn:      { position: 'absolute', right: 14, padding: 4 },
  errorBox:    {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#450a0a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  errorText:   { color: '#fca5a5', fontSize: 13, flex: 1 },
  btn:         {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:      { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 },

  // Modales
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#1e293b', borderRadius: 20,
    padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#451a03',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 10, textAlign: 'center' },
  modalBody:  { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBtn:   {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 32,
    alignItems: 'center', width: '100%', marginBottom: 10,
  },
  modalBtnText:          { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBtnSecondary:     { paddingVertical: 10, alignItems: 'center', width: '100%' },
  modalBtnSecondaryText: { color: '#64748b', fontSize: 14 },
})
