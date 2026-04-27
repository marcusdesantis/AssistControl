import { useAuthStore } from '@/store/authStore'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProfileScreen() {
  const { fullName, employeeCode, email, clearAuth } = useAuthStore()

  const doLogout = async () => {
    await clearAuth()
    router.replace('/(auth)')
  }

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert no funciona en web
      if (window.confirm('¿Deseas cerrar sesión?')) doLogout()
      return
    }
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
    ])
  }

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

        <View style={styles.infoCard}>
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AssistControl v1.0.0</Text>
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
  code:         { fontSize: 14, color: '#64748b', marginBottom: 28 },
  infoCard:     {
    width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden', marginBottom: 24,
  },
  infoRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  divider:      { height: 1, backgroundColor: '#334155' },
  infoLabel:    { fontSize: 13, color: '#64748b', width: 60 },
  infoValue:    { flex: 1, fontSize: 14, color: '#f1f5f9', fontWeight: '500', textAlign: 'right' },
  logoutBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14, width: '100%',
    justifyContent: 'center',
  },
  logoutText:   { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  version:      { color: '#334155', fontSize: 12, marginTop: 'auto', paddingBottom: 8 },
})
