import { mobileService, type AttendanceRecord, type EmployeeMessage, type EmployeeStatus } from '@/services/mobileService'
import { useAuthStore } from '@/store/authStore'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function formatTime(iso: string | null): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ─── Modal de mensajes pendientes ────────────────────────────────────────────
function MessageModal({
  messages,
  onClose,
}: {
  messages: EmployeeMessage[]
  onClose:  () => void
}) {
  const [index,    setIndex]    = useState(0)
  const [handling, setHandling] = useState(false)

  const msg = messages[index]

  // Marcar como leído automáticamente al mostrar cada mensaje
  useEffect(() => {
    if (!msg) return
    mobileService.markMessageRead(msg.id).catch(() => {})
  }, [msg?.id])

  if (!msg) return null

  const next = () => {
    if (index + 1 < messages.length) setIndex(index + 1)
    else onClose()
  }

  const handleAccept = async () => {
    if (!msg.allowDelete) { next(); return }
    setHandling(true)
    try {
      await mobileService.deleteMessage(msg.id)
    } catch { /* ignorar */ }
    finally { setHandling(false); next() }
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={msgStyles.overlay}>
        <View style={msgStyles.card}>
          {/* Header */}
          <View style={msgStyles.header}>
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={msgStyles.headerTitle}>Mensaje</Text>
            {messages.length > 1 && (
              <View style={msgStyles.counter}>
                <Text style={msgStyles.counterText}>{index + 1} / {messages.length}</Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={msgStyles.body}>
            <View style={msgStyles.row}>
              <Text style={msgStyles.label}>De:</Text>
              <Text style={msgStyles.value}>{msg.senderName}</Text>
            </View>
            <View style={msgStyles.row}>
              <Text style={msgStyles.label}>Fecha:</Text>
              <Text style={msgStyles.value}>{formatDateShort(msg.createdAt)}</Text>
            </View>
            <View style={msgStyles.row}>
              <Text style={msgStyles.label}>Asunto:</Text>
              <Text style={[msgStyles.value, { fontWeight: '700' }]}>{msg.subject}</Text>
            </View>
            <View style={msgStyles.bodyBox}>
              <Text style={msgStyles.bodyText}>{msg.body}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={msgStyles.footer}>
            <TouchableOpacity style={msgStyles.closeBtn} onPress={next}>
              <Text style={msgStyles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
            {msg.allowDelete && (
              <TouchableOpacity
                style={[msgStyles.acceptBtn, handling && { opacity: 0.6 }]}
                onPress={handleAccept}
                disabled={handling}
              >
                {handling
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={msgStyles.acceptBtnText}>Aceptar y borrar</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function HomeScreen() {
  const { fullName, employeeCode, companyName } = useAuthStore()

  const [status,      setStatus]      = useState<EmployeeStatus | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [acting,      setActing]      = useState(false)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  // PIN step (siempre requerido)
  const [pinStep,     setPinStep]     = useState(false)
  const [pinCode,     setPinCode]     = useState('')
  // OTP step (solo si tenant tiene 2FA)
  const [otpStep,     setOtpStep]     = useState(false)
  const [otpEmail,    setOtpEmail]    = useState<string | null>(null)
  const [otpCode,     setOtpCode]     = useState('')
  // Ubicación pendiente mientras se ingresa PIN/OTP
  const [pending,     setPending]     = useState<{ lat?: number; lon?: number; pin?: string } | null>(null)
  // Mensajes pendientes tras check-in/check-out
  const [pendingMsgs, setPendingMsgs] = useState<EmployeeMessage[]>([])
  // GPS bloqueado
  const [gpsBlocked,  setGpsBlocked]  = useState<'services' | 'permission' | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const s = await mobileService.getStatus()
      setStatus(s)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? 'Error al cargar estado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { loadStatus() }, [loadStatus]))

  const ensureLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    const servicesEnabled = await Location.hasServicesEnabledAsync()
    if (!servicesEnabled) { setGpsBlocked('services'); return null }

    const { status: existing } = await Location.getForegroundPermissionsAsync()
    if (existing !== 'granted') {
      const { status: requested } = await Location.requestForegroundPermissionsAsync()
      if (requested !== 'granted') { setGpsBlocked('permission'); return null }
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
  }

  const resetFlow = () => {
    setPinStep(false); setPinCode('')
    setOtpStep(false); setOtpCode('')
    setPending(null);  setErrorMsg(null)
  }

  const doCheckIn = async (lat?: number, lon?: number, pin?: string, otp?: string) => {
    setActing(true)
    setErrorMsg(null)
    try {
      const result = await mobileService.checkIn(lat, lon, pin, otp)
      resetFlow()
      await loadStatus()
      if (result.pendingMessages?.length > 0) setPendingMsgs(result.pendingMessages)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Error al registrar entrada.')
    } finally {
      setActing(false)
    }
  }

  const doCheckOut = async () => {
    const loc = await ensureLocation()
    if (!loc) return
    setActing(true)
    setErrorMsg(null)
    try {
      const result = await mobileService.checkOut(loc.latitude, loc.longitude)
      await loadStatus()
      if (result.pendingMessages?.length > 0) setPendingMsgs(result.pendingMessages)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Error al registrar salida.')
    } finally {
      setActing(false)
    }
  }

  // Paso 1: verificar GPS y mostrar pantalla de PIN
  const handleCheckIn = async () => {
    const loc = await ensureLocation()
    if (!loc) return
    setErrorMsg(null)
    setPinStep(true)
  }

  // Paso 2: validar PIN con el backend y opcionalmente pedir OTP
  const submitPin = async () => {
    if (!pinCode.trim()) { setErrorMsg('Ingresa tu clave.'); return }
    setActing(true)
    setErrorMsg(null)
    try {
      const loc = await ensureLocation()
      if (!loc) { setActing(false); return }
      if (!res.required) {
        // Sin 2FA — registrar directamente con PIN
        await doCheckIn(loc?.latitude, loc?.longitude, pinCode.trim())
      } else {
        // Con 2FA — mostrar pantalla OTP
        setPending({ lat: loc?.latitude, lon: loc?.longitude, pin: pinCode.trim() })
        setOtpEmail(res.maskedEmail)
        setPinStep(false)
        setOtpStep(true)
        setActing(false)
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Error al validar clave.')
      setActing(false)
    }
  }

  // Paso 3 (solo 2FA): enviar OTP
  const submitOtp = () => {
    if (!otpCode.trim()) { setErrorMsg('Ingresa el código de verificación.'); return }
    doCheckIn(pending?.lat, pending?.lon, pending?.pin, otpCode.trim())
  }

  const handleCheckOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas registrar tu salida ahora?')) doCheckOut()
      return
    }
    Alert.alert('Confirmar salida', '¿Deseas registrar tu salida ahora?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Registrar', onPress: doCheckOut },
    ])
  }

  const today = status?.today

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} tintColor="#3b82f6" />}
      >
        {/* Saludo */}
        <View style={styles.greeting}>
          {companyName && (
            <Text style={styles.greetCompany}>{companyName}</Text>
          )}
          <Text style={styles.greetName}>{fullName ?? 'Empleado'}</Text>
          <Text style={styles.greetCode}>{employeeCode}</Text>
        </View>

        {/* Tarjeta de estado */}
        <View style={styles.card}>
          <Text style={styles.dateLabel}>
            {today ? formatDate(today.date) : formatDate(new Date().toISOString().split('T')[0])}
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeCaption}>Entrada</Text>
              <Text style={[styles.timeValue, !today?.checkInTime && styles.timeDim]}>
                {formatTime(today?.checkInTime ?? null)}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeCaption}>Salida</Text>
              <Text style={[styles.timeValue, !today?.checkOutTime && styles.timeDim]}>
                {formatTime(today?.checkOutTime ?? null)}
              </Text>
            </View>
          </View>

          {/* Badge de estado */}
          {today && (
            <View style={[styles.badge, today.status === 'Late' ? styles.badgeLate : styles.badgePresent]}>
              <Text style={styles.badgeText}>{today.statusLabel}</Text>
              {today.lateMinutes > 0 && (
                <Text style={styles.badgeSub}>{today.lateMinutes} min de retraso</Text>
              )}
            </View>
          )}
        </View>

        {/* Error */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Pantalla PIN */}
        {pinStep && (
          <View style={styles.otpCard}>
            <Ionicons name="keypad-outline" size={32} color="#3b82f6" style={{ marginBottom: 8 }} />
            <Text style={styles.otpTitle}>Ingresa tu clave</Text>
            <Text style={styles.otpSubtitle}>Necesitamos verificar tu identidad antes de registrar la entrada</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="••••"
              placeholderTextColor="#475569"
              value={pinCode}
              onChangeText={setPinCode}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              autoFocus
            />
            <View style={styles.otpBtns}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={resetFlow}>
                <Text style={styles.otpCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirmBtn, acting && styles.btnDisabled]}
                onPress={submitPin}
                disabled={acting}
              >
                {acting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.otpConfirmText}>Continuar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pantalla OTP */}
        {otpStep && (
          <View style={styles.otpCard}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#3b82f6" style={{ marginBottom: 8 }} />
            <Text style={styles.otpTitle}>Verificación en dos pasos</Text>
            {otpEmail && (
              <Text style={styles.otpSubtitle}>
                Se envió un código a{'\n'}<Text style={styles.otpEmail}>{otpEmail}</Text>
              </Text>
            )}
            <TextInput
              style={styles.otpInput}
              placeholder="Código de 6 dígitos"
              placeholderTextColor="#475569"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.otpBtns}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={resetFlow}>
                <Text style={styles.otpCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirmBtn, acting && styles.btnDisabled]}
                onPress={submitOtp}
                disabled={acting}
              >
                {acting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.otpConfirmText}>Verificar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botones de acción */}
        {!pinStep && !otpStep && (acting
          ? (
            <View style={styles.actingBox}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.actingText}>Procesando…</Text>
            </View>
          )
          : status?.isCheckedIn
            ? (
              <TouchableOpacity style={[styles.actionBtn, styles.checkOutBtn]} onPress={handleCheckOut}>
                <Ionicons name="log-out-outline" size={26} color="#fff" />
                <Text style={styles.actionBtnText}>Registrar Salida</Text>
              </TouchableOpacity>
            )
            : (
              <TouchableOpacity style={[styles.actionBtn, styles.checkInBtn]} onPress={handleCheckIn}>
                <Ionicons name="log-in-outline" size={26} color="#fff" />
                <Text style={styles.actionBtnText}>Registrar Entrada</Text>
              </TouchableOpacity>
            )
        )}

        {/* Ubicación */}
        {today?.latitude != null && (
          <View style={styles.gpsBox}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.gpsText}>
              GPS: {today.latitude.toFixed(5)}, {today.longitude!.toFixed(5)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de mensajes pendientes */}
      {pendingMsgs.length > 0 && (
        <MessageModal
          messages={pendingMsgs}
          onClose={() => setPendingMsgs([])}
        />
      )}

      {/* Modal: GPS requerido */}
      <Modal
        visible={gpsBlocked !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGpsBlocked(null)}
      >
        <View style={gpsStyles.overlay}>
          <View style={gpsStyles.card}>
            <View style={gpsStyles.iconWrap}>
              <Ionicons name="location-outline" size={36} color="#3b82f6" />
            </View>
            <Text style={gpsStyles.title}>Ubicación requerida</Text>
            <Text style={gpsStyles.body}>
              {gpsBlocked === 'services'
                ? 'El GPS de tu dispositivo está desactivado. Actívalo en Configuración para poder registrar tu asistencia.'
                : 'Esta app necesita acceso a tu ubicación para registrar asistencia. Activa el permiso en Configuración.'}
            </Text>
            <TouchableOpacity
              style={gpsStyles.btnPrimary}
              onPress={() => { setGpsBlocked(null); Linking.openSettings() }}
            >
              <Ionicons name="settings-outline" size={16} color="#fff" />
              <Text style={gpsStyles.btnPrimaryText}>Abrir Configuración</Text>
            </TouchableOpacity>
            <TouchableOpacity style={gpsStyles.btnSecondary} onPress={() => setGpsBlocked(null)}>
              <Text style={gpsStyles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const msgStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:         { backgroundColor: '#1e293b', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e40af', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:  { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 },
  counter:      { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  counterText:  { color: '#fff', fontSize: 11, fontWeight: '600' },
  body:         { padding: 16, gap: 10 },
  row:          { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  label:        { color: '#64748b', fontSize: 13, fontWeight: '600', width: 58 },
  value:        { color: '#e2e8f0', fontSize: 13, flex: 1 },
  bodyBox:      { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#334155', marginTop: 4 },
  bodyText:     { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  footer:       { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  closeBtn:     { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  closeBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  acceptBtn:    { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#1e40af', alignItems: 'center' },
  acceptBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
})

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0f172a' },
  scroll:       { padding: 20, paddingBottom: 40 },
  greeting:     { marginBottom: 20 },
  greetCompany: { fontSize: 12, fontWeight: '600', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  greetName:    { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  greetCode:    { fontSize: 13, color: '#64748b', marginTop: 2 },
  card:         {
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#334155',
  },
  dateLabel:    { fontSize: 13, color: '#64748b', marginBottom: 16, textTransform: 'capitalize' },
  timeRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timeBlock:    { flex: 1, alignItems: 'center' },
  timeDivider:  { width: 1, height: 48, backgroundColor: '#334155' },
  timeCaption:  { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  timeValue:    { fontSize: 30, fontWeight: '700', color: '#f1f5f9' },
  timeDim:      { color: '#334155' },
  badge:        {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20,
  },
  badgePresent: { backgroundColor: '#14532d' },
  badgeLate:    { backgroundColor: '#7c2d12' },
  badgeText:    { color: '#86efac', fontSize: 12, fontWeight: '700' },
  badgeSub:     { color: '#fca5a5', fontSize: 11, marginTop: 2 },
  errorBox:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText:    { color: '#fca5a5', fontSize: 13, flex: 1 },
  actionBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 18, marginBottom: 12,
  },
  checkInBtn:   { backgroundColor: '#16a34a' },
  checkOutBtn:  { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  actingBox:    { alignItems: 'center', paddingVertical: 24, gap: 12 },
  actingText:   { color: '#94a3b8', fontSize: 14 },
  btnDisabled:  { opacity: 0.6 },
  otpCard:      {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#3b82f6',
    padding: 24, marginBottom: 16, alignItems: 'center',
  },
  otpTitle:     { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  otpSubtitle:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  otpEmail:     { color: '#60a5fa', fontWeight: '600' },
  otpInput:     {
    width: '100%', backgroundColor: '#0f172a',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontWeight: '700', color: '#f1f5f9',
    borderWidth: 1, borderColor: '#334155',
    textAlign: 'center', letterSpacing: 8, marginBottom: 16,
  },
  otpBtns:       { flexDirection: 'row', gap: 10, width: '100%' },
  otpCancelBtn:  {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  otpCancelText: { color: '#94a3b8', fontWeight: '600' },
  otpConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2563eb', alignItems: 'center',
  },
  otpConfirmText: { color: '#fff', fontWeight: '700' },
  gpsBox:       {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8,
  },
  gpsText:      { color: '#475569', fontSize: 11 },
})

const gpsStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card:           { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  iconWrap:       { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0f2d5e', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:          { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 10, textAlign: 'center' },
  body:           { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btnPrimary:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 24, width: '100%', justifyContent: 'center', marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary:   { paddingVertical: 10, width: '100%', alignItems: 'center' },
  btnSecondaryText: { color: '#64748b', fontSize: 14 },
})
