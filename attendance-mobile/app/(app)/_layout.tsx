import { mobileService, type MobileNotification } from '@/services/mobileService'
import { useAuthStore } from '@/store/authStore'
import { emitter } from '@/utils/eventEmitter'
import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs, router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// ─── Bell header button ───────────────────────────────────────────────────────

function BellButton({ unread }: { unread: number }) {
  return (
    <TouchableOpacity onPress={() => router.navigate('/notifications')} style={bell.btn}>
      <Ionicons name="notifications-outline" size={22} color="#f1f5f9" />
      {unread > 0 && (
        <View style={bell.badge}>
          <Text style={bell.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const bell = StyleSheet.create({
  btn:          { marginRight: 12, padding: 4, position: 'relative' },
  badge:        {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText:    { color: '#fff', fontSize: 9, fontWeight: '700' },
})

// ─── Notification popup modal ─────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  info:    '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error:   '#ef4444',
}

const TYPE_ICON: Record<string, string> = {
  info:    'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  error:   'alert-circle-outline',
}

const TYPE_LABEL: Record<string, string> = {
  info: 'Información', success: 'Éxito', warning: 'Advertencia', error: 'Alerta',
}

function NotifModal({ notif, onDismiss, onMarkRead }: {
  notif:      MobileNotification
  onDismiss:  () => void
  onMarkRead: () => void
}) {
  const color = TYPE_COLOR[notif.type] ?? TYPE_COLOR.info
  const icon  = TYPE_ICON[notif.type]  ?? TYPE_ICON.info
  const label = TYPE_LABEL[notif.type] ?? notif.type

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <View style={[modal.iconWrap, { backgroundColor: color + '22' }]}>
            <Ionicons name={icon as any} size={36} color={color} />
          </View>
          <View style={[modal.badge, { backgroundColor: color + '22' }]}>
            <Text style={[modal.badgeText, { color }]}>{label}</Text>
          </View>
          <Text style={modal.title}>{notif.title}</Text>
          <Text style={modal.body}>{notif.body}</Text>
          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.btnSecondary} onPress={onDismiss}>
              <Text style={modal.btnSecondaryText}>Entendido</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modal.btnPrimary, { backgroundColor: color }]} onPress={onMarkRead}>
              <Text style={modal.btnPrimaryText}>Marcar como leída</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const modal = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:             { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 14 },
  iconWrap:         { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badge:            { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 12 },
  badgeText:        { fontSize: 11, fontWeight: '700' },
  title:            { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 10, textAlign: 'center' },
  body:             { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btnRow:           { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary:     { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  btnPrimary:       { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
})

// ─── Company header title ─────────────────────────────────────────────────────

function CompanyHeader() {
  const companyName = useAuthStore((s) => s.companyName)
  const logoBase64  = useAuthStore((s) => s.logoBase64)
  const logoUrl     = useAuthStore((s) => s.logoUrl)

  const logoSource = logoBase64
    ? { uri: `data:image/png;base64,${logoBase64}` }
    : logoUrl ? { uri: logoUrl } : null

  return (
    <View style={hdr.row}>
      {logoSource ? (
        <Image source={logoSource} style={hdr.logo} resizeMode="contain" />
      ) : (
        <View style={hdr.iconCircle}>
          <Ionicons name="business-outline" size={20} color="#93c5fd" />
        </View>
      )}
      <Text style={hdr.name} numberOfLines={1}>{companyName ?? 'TiempoYa'}</Text>
    </View>
  )
}

const hdr = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo:       { width: 36, height: 36, borderRadius: 8 },
  iconCircle: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  name:       { fontSize: 15, fontWeight: '700', color: '#f1f5f9', maxWidth: 200 },
})

// ─── Layout ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000

export default function AppLayout() {
  const token = useAuthStore((s) => s.token)

  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const appStateRef    = useRef(AppState.currentState)
  const lastNotifIdRef = useRef<string | null>(null)
  const isFirstRef     = useRef(true)

  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [popupNotif,   setPopupNotif]   = useState<MobileNotification | null>(null)

  const loadUnread = useCallback(async () => {
    try {
      const data = await mobileService.getNotifications(1, 5)
      setUnreadNotifs(data.unread)

      // Detectar notificaciones nuevas no leídas para mostrar popup
      const latestUnread = data.items.find(n => !n.isRead)
      if (latestUnread && !isFirstRef.current && latestUnread.id !== lastNotifIdRef.current) {
        setPopupNotif(latestUnread)
      }
      if (latestUnread) lastNotifIdRef.current = latestUnread.id
      isFirstRef.current = false
    } catch { /* silent */ }
  }, [])

  const dismissPopup = useCallback(() => {
    setPopupNotif(null)
  }, [])

  const markReadAndClose = useCallback(() => {
    if (popupNotif) {
      mobileService.markNotificationRead(popupNotif.id).catch(() => {})
      setUnreadNotifs(p => Math.max(0, p - 1))
      emitter.emit('notifications:read')
    }
    setPopupNotif(null)
  }, [popupNotif])

  useEffect(() => {
    if (!token) return

    const check = () => { mobileService.getStatus().catch(() => {}) }

    const startPolling = () => {
      check()
      loadUnread()
      intervalRef.current = setInterval(() => { check(); loadUnread() }, POLL_INTERVAL_MS)
    }

    const stopPolling = () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }

    startPolling()

    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        stopPolling(); startPolling()
      } else if (next.match(/inactive|background/)) {
        stopPolling()
      }
      appStateRef.current = next
    })

    return () => { stopPolling(); sub.remove() }
  }, [token])

  useEffect(() => {
    return emitter.on('notifications:read', loadUnread)
  }, [loadUnread])

  if (!token) return <Redirect href="/(auth)" />

  const headerRight = () => <BellButton unread={unreadNotifs} />

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor:   '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#1e293b',
            borderTopColor:  '#334155',
            paddingBottom:   8,
            height:          62,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerStyle:      { backgroundColor: '#0f172a' },
          headerTintColor:  '#f1f5f9',
          headerTitleStyle: { fontWeight: '700' },
          headerTitle:      () => <CompanyHeader />,
          headerRight,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title:      'Asistencia',
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title:      'Historial',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title:      'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title:      'Notificaciones',
            tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
            href: null,
          }}
        />
      </Tabs>

      {popupNotif && <NotifModal notif={popupNotif} onDismiss={dismissPopup} onMarkRead={markReadAndClose} />}
    </>
  )
}
