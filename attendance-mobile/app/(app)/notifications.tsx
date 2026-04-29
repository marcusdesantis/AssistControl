import { mobileService, type MobileNotification } from '@/services/mobileService'
import { emitter } from '@/utils/eventEmitter'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d} d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsScreen() {
  const [items,       setItems]       = useState<MobileNotification[]>([])
  const [unread,      setUnread]      = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [marking,     setMarking]     = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await mobileService.getNotifications(1, 50)
      setItems(data.items)
      setUnread(data.unread)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const markOne = async (id: string) => {
    try {
      await mobileService.markNotificationRead(id)
      setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnread(p => { const next = Math.max(0, p - 1); emitter.emit('notifications:read'); return next })
    } catch { /* silent */ }
  }

  const markAll = async () => {
    if (unread === 0) return
    setMarking(true)
    try {
      await mobileService.markNotificationRead()
      setItems(p => p.map(n => ({ ...n, isRead: true })))
      setUnread(0)
      emitter.emit('notifications:read')
    } catch { /* silent */ }
    finally { setMarking(false) }
  }

  const toggleExpand = (n: MobileNotification) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(n.id) ? next.delete(n.id) : next.add(n.id)
      return next
    })
    if (!n.isRead) markOne(n.id)
  }

  const renderItem = ({ item: n }: { item: MobileNotification }) => {
    const color    = TYPE_COLOR[n.type] ?? TYPE_COLOR.info
    const icon     = TYPE_ICON[n.type]  ?? TYPE_ICON.info
    const expanded = expandedIds.has(n.id)
    return (
      <TouchableOpacity
        onPress={() => toggleExpand(n)}
        activeOpacity={0.7}
        style={[styles.item, !n.isRead && styles.itemUnread]}
      >
        <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !n.isRead && styles.titleBold]} numberOfLines={1}>
              {n.title}
            </Text>
            {!n.isRead && <View style={[styles.dot, { backgroundColor: color }]} />}
          </View>
          <Text style={styles.body} numberOfLines={expanded ? undefined : 3}>{n.body}</Text>
          <View style={styles.footer}>
            <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
            <Ionicons
              name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={14}
              color="#475569"
            />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Subheader */}
      <View style={styles.subheader}>
        <Text style={styles.subCount}>
          {unread > 0 ? `${unread} sin leer` : 'Todo leído'}
        </Text>
        <TouchableOpacity
          onPress={markAll}
          disabled={marking || unread === 0}
          style={[styles.markBtn, unread === 0 && styles.markBtnDisabled]}
        >
          {marking
            ? <ActivityIndicator size="small" color="#94a3b8" />
            : <Ionicons name="checkmark-done-outline" size={16} color={unread === 0 ? '#475569' : '#3b82f6'} />}
          <Text style={[styles.markBtnText, unread === 0 && styles.markBtnTextDisabled]}>
            Marcar todo leído
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#334155" />
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#3b82f6" />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0f172a' },
  subheader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  subCount:          { fontSize: 13, color: '#64748b' },
  markBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  markBtnDisabled:   { opacity: 0.4 },
  markBtnText:       { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  markBtnTextDisabled: { color: '#475569' },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:         { color: '#475569', fontSize: 14 },
  list:              { paddingBottom: 32 },
  item:              { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemUnread:        { backgroundColor: '#0f2444' },
  iconCircle:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content:           { flex: 1 },
  titleRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title:             { fontSize: 14, color: '#94a3b8', flex: 1 },
  titleBold:         { color: '#f1f5f9', fontWeight: '700' },
  dot:               { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body:              { fontSize: 13, color: '#64748b', lineHeight: 18 },
  footer:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  time:              { fontSize: 11, color: '#475569' },
  separator:         { height: 1, backgroundColor: '#1e293b', marginLeft: 72 },
})
