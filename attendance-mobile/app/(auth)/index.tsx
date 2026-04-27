import { mobileService } from '@/services/mobileService'
import { useAuthStore } from '@/store/authStore'
import { storage } from '@/utils/storage'
import { registerForPushNotifications } from '@/utils/notifications'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
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

  useEffect(() => {
    storage.getItem('login_notice').then((notice) => {
      if (notice === 'user_inactive') {
        storage.deleteItem('login_notice')
        setUserInactiveModal(true)
      }
    })
  }, [])

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await mobileService.login(username.trim().toLowerCase(), password.trim())

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

      router.replace('/(app)')
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'USER_INACTIVE') {
        setUserInactiveModal(true)
      } else {
        const msg = e?.response?.data?.message ?? e?.message ?? 'Error al iniciar sesión.'
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

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
          <Text style={styles.title}>AssistControl</Text>
          <Text style={styles.subtitle}>Acceso para empleados</Text>
        </View>

        {/* Formulario */}
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
            keyboardType="default"
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

      {/* Modal: usuario desactivado */}
      <Modal
        visible={userInactiveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setUserInactiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-remove-outline" size={36} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Usuario desactivado</Text>
            <Text style={styles.modalBody}>
              Tu usuario ha sido desactivado por el administrador. Contacta con tu empresa para más información.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setUserInactiveModal(false)}
            >
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
  header:      { alignItems: 'center', marginBottom: 36 },
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
  form:        { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, gap: 4 },
  label:       { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 4 },
  input:       {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:      { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#451a03',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18, fontWeight: '700', color: '#f1f5f9',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#94a3b8', textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  modalBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
})
