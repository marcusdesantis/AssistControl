import { useAuthStore } from '@/store/authStore'
import * as biometric from '@/services/biometricService'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProfileScreen() {
  const { fullName, employeeCode, email, clearAuth } = useAuthStore()

  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled,   setBiometricEnabled]   = useState(false)
  const [biometricType,      setBiometricType]      = useState<biometric.BiometricType>('none')
  const [toggling,           setToggling]           = useState(false)

  useEffect(() => {
    biometric.isBiometricAvailable().then(available => {
      setBiometricAvailable(available)
      if (available) {
        biometric.getBiometricType().then(setBiometricType)
        biometric.isBiometricEnabled().then(setBiometricEnabled)
      }
    })
  }, [])

  const handleBiometricToggle = async (value: boolean) => {
    if (toggling) return
    setToggling(true)
    try {
      if (value) {
        // Activar — pedir credenciales al usuario
        Alert.alert(
          biometricType === 'facial' ? 'Activar Face ID' : 'Activar huella digital',
          'Para activar el acceso biométrico necesitas ingresar tu usuario y contraseña una vez más. Hazlo desde la pantalla de inicio de sesión.',
          [{ text: 'Entendido' }]
        )
      } else {
        // Desactivar
        Alert.alert(
          'Desactivar acceso biométrico',
          '¿Deseas desactivar el acceso con huella digital / Face ID?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setToggling(false) },
            {
              text: 'Desactivar',
              style: 'destructive',
              onPress: async () => {
                await biometric.disableBiometric()
                setBiometricEnabled(false)
                setToggling(false)
              },
            },
          ]
        )
        return
      }
    } finally {
      setToggling(false)
    }
  }

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

  const biometricIcon  = biometricType === 'facial' ? 'scan-outline' : 'finger-print-outline'
  const biometricLabel = biometricType === 'facial' ? 'Face ID' : 'Huella digital'

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {fullName?.charAt(0).toUpperCase() ?? '?'}
          </Text>
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

        {/* Seguridad — biométrico */}
        {biometricAvailable && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
              <Text style={styles.sectionTitle}>Seguridad</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name={biometricIcon} size={18} color={biometricEnabled ? '#3b82f6' : '#64748b'} />
              <Text style={styles.infoLabel}>{biometricLabel}</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={toggling}
                trackColor={{ false: '#334155', true: '#1d4ed8' }}
                thumbColor={biometricEnabled ? '#3b82f6' : '#64748b'}
              />
            </View>
            {biometricEnabled && (
              <Text style={styles.biometricHint}>
                Puedes ingresar usando tu {biometricLabel.toLowerCase()} en la pantalla de acceso.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TiempoYa v1.0.0</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0f172a' },
  container:    { flex: 1, alignItems: 'center', padding: 24 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 12,
  },
  avatarText:   { fontSize: 36, fontWeight: '700', color: '#fff' },
  name:         { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  code:         { fontSize: 14, color: '#64748b', marginBottom: 20 },

  card: {
    width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  sectionTitle:  { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  divider:      { height: 1, backgroundColor: '#334155' },
  infoLabel:    { fontSize: 13, color: '#64748b', flex: 1 },
  infoValue:    { fontSize: 14, color: '#f1f5f9', fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  biometricHint:{ fontSize: 12, color: '#475569', paddingHorizontal: 14, paddingBottom: 12 },

  logoutBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14, width: '100%',
    justifyContent: 'center',
  },
  logoutText:   { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  version:      { color: '#334155', fontSize: 12, marginTop: 'auto', paddingBottom: 8 },
})
