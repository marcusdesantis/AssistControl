import { mobileService, type AttendanceRecord } from '@/services/mobileService'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PAGE_SIZE = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatHours(hours: number | null): string {
  if (!hours || hours <= 0) return '—'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Date input (web usa <input type="date">, native usa TextInput) ─────────
function DateInput({ value, onChange, max, min, label }: {
  value: string; onChange: (v: string) => void
  max?: string; min?: string; label: string
}) {
  return (
    <View style={di.wrap}>
      <Text style={di.label}>{label}</Text>
      {Platform.OS === 'web'
        ? (
          // @ts-ignore — input HTML nativo en web
          <input
            type="date"
            value={value}
            max={max}
            min={min}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 14,
              colorScheme: 'dark',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        )
        : (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#475569"
            style={di.input}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        )
      }
    </View>
  )
}

const di = StyleSheet.create({
  wrap:  { flex: 1, minWidth: 0 },
  label: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e293b', color: '#f1f5f9',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14,
  },
})

// ─── Status colors / labels ───────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  Present: '#16a34a', Late: '#ea580c', Absent: '#dc2626', HalfDay: '#d97706',
}
const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente', Late: 'Tarde', Absent: 'Ausente', HalfDay: 'Medio día',
}
const ORIGIN_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Web: 'globe-outline', Mobile: 'phone-portrait-outline', Checker: 'tablet-portrait-outline',
}

// ─── List item type ────────────────────────────────────────────────────────────
type ListItem =
  | { kind: 'header'; date: string }
  | { kind: 'record'; record: AttendanceRecord }

function buildItems(records: AttendanceRecord[]): ListItem[] {
  const items: ListItem[] = []
  let lastDate = ''
  for (const r of records) {
    if (r.date !== lastDate) {
      lastDate = r.date
      items.push({ kind: 'header', date: r.date })
    }
    items.push({ kind: 'record', record: r })
  }
  return items
}

// ─── Record card ───────────────────────────────────────────────────────────────
function RecordCard({ item }: { item: AttendanceRecord }) {
  const color      = STATUS_COLOR[item.status] ?? '#64748b'
  const label      = STATUS_LABEL[item.status] ?? item.statusLabel
  const originIcon = ORIGIN_ICON[item.registeredFrom] ?? 'ellipse-outline'

  return (
    <View style={styles.card}>
      <View style={[styles.cardBar, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
          <View style={styles.originChip}>
            <Ionicons name={originIcon} size={12} color="#64748b" />
            <Text style={styles.originText}>{item.registeredFrom || '—'}</Text>
          </View>
        </View>
        <View style={styles.timesRow}>
          {[
            { icon: 'log-in-outline'  as const, color: '#3b82f6', label: 'Entrada',  value: formatTime(item.checkInTime)  },
            { icon: 'log-out-outline' as const, color: '#8b5cf6', label: 'Salida',   value: formatTime(item.checkOutTime) },
            { icon: 'time-outline'    as const, color: '#10b981', label: 'Duración', value: formatHours(item.hoursWorked) },
          ].map((t, i, arr) => (
            <View key={t.label} style={styles.timeBlock}>
              <Ionicons name={t.icon} size={14} color={t.color} />
              <View>
                <Text style={styles.timeLabel}>{t.label}</Text>
                <Text style={styles.timeValue}>{t.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.timeSep} />}
            </View>
          ))}
        </View>
        {item.lateMinutes > 0 && (
          <View style={styles.lateRow}>
            <Ionicons name="alert-circle-outline" size={12} color="#ea580c" />
            <Text style={styles.lateText}>{item.lateMinutes} min de retraso</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const today = toLocalDate(new Date())
  const firstOfMonth = (() => { const d = new Date(); d.setDate(1); return toLocalDate(d) })()

  const [fromDate,   setFromDate]   = useState(firstOfMonth)
  const [toDate,     setToDate]     = useState(today)
  const [records,    setRecords]    = useState<AttendanceRecord[]>([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [loadingMore,setLoadingMore]= useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  // keep refs to avoid stale closures in onEndReached
  const pageRef    = useRef(page)
  const hasMoreRef = useRef(hasMore)
  pageRef.current    = page
  hasMoreRef.current = hasMore

  const fetchPage = useCallback(async (
    pageNum: number, from: string, to: string, mode: 'replace' | 'append' | 'refresh'
  ) => {
    if (mode === 'replace') setLoading(true)
    else if (mode === 'refresh') setRefreshing(true)
    else setLoadingMore(true)
    setErrorMsg(null)
    try {
      const res = await mobileService.getHistory({ from, to, page: pageNum, pageSize: PAGE_SIZE })
      setRecords(prev => mode === 'append' ? [...prev, ...res.items] : res.items)
      setHasMore(res.hasMore)
      setTotalCount(res.totalCount)
      setPage(pageNum)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? 'Error al cargar historial.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    fetchPage(1, fromDate, toDate, 'replace')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []))

  const handleSearch = () => fetchPage(1, fromDate, toDate, 'replace')
  const handleRefresh = () => fetchPage(1, fromDate, toDate, 'refresh')
  const handleLoadMore = () => {
    if (!hasMoreRef.current || loadingMore || loading) return
    fetchPage(pageRef.current + 1, fromDate, toDate, 'append')
  }

  const items: ListItem[] = buildItems(records)
  const presentCount = records.filter(r => r.checkOutTime).length
  const lateCount    = records.filter(r => r.status === 'Late').length
  const totalHours   = records.reduce((s, r) => s + (r.hoursWorked ?? 0), 0)

  const listHeader = (
    <>
      {/* Filtro de fechas */}
      <View style={styles.filterBox}>
        <View style={styles.dateRow}>
          <DateInput label="Desde" value={fromDate} onChange={setFromDate} max={toDate} />
          <DateInput label="Hasta" value={toDate} onChange={setToDate} min={fromDate} max={today} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search-outline" size={16} color="#fff" />
          <Text style={styles.searchBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      {!loading && records.length > 0 && (
        <View style={styles.summaryRow}>
          {[
            { value: totalCount,                   label: 'Total',     color: '#f1f5f9' },
            { value: presentCount,                 label: 'Completos', color: '#86efac' },
            { value: lateCount,                    label: 'Tardanzas', color: '#fdba74' },
            { value: `${Math.floor(totalHours)}h`, label: 'Horas',     color: '#93c5fd' },
          ].map(s => (
            <View key={s.label} style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Error */}
      {errorMsg && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Spinner de carga inicial */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      )}
    </>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item, i) =>
          item.kind === 'header' ? `hdr-${item.date}` : `rec-${item.record.id}-${i}`
        }
        renderItem={({ item }) =>
          item.kind === 'header'
            ? (
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{formatDateHeader(item.date)}</Text>
              </View>
            )
            : <RecordCard item={item.record} />
        }
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.list, !loading && items.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={44} color="#334155" />
              <Text style={styles.emptyText}>Sin registros</Text>
              <Text style={styles.emptySubText}>No se encontraron registros en el rango seleccionado</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#3b82f6" size="small" />
              <Text style={styles.footerText}>Cargando más…</Text>
            </View>
          ) : !hasMore && records.length > 0 ? (
            <Text style={styles.footerEnd}>— Fin del historial —</Text>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },

  // Filter
  filterBox: {
    paddingTop: 12, paddingBottom: 10, gap: 10,
  },
  dateRow:  { flexDirection: 'row', gap: 10 },
  dateSep:  {},
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Summary
  summaryRow: { flexDirection: 'row', paddingTop: 10, paddingBottom: 2, gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12,
    alignItems: 'center', paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // List
  list:       { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },
  listEmpty:  { flexGrow: 1 },
  dateHeader: { paddingTop: 8, paddingBottom: 6, paddingHorizontal: 2 },
  dateHeaderText: {
    fontSize: 12, fontWeight: '700', color: '#64748b',
    textTransform: 'capitalize', letterSpacing: 0.3,
  },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: '#1e293b',
    borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },
  cardBar:     { width: 4 },
  cardBody:    { flex: 1, padding: 14, gap: 10 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 12, fontWeight: '700' },
  originChip:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  originText:  { fontSize: 11, color: '#64748b' },
  timesRow:    { flexDirection: 'row', alignItems: 'center', gap: 0 },
  timeBlock:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeSep:     { width: 1, height: 28, backgroundColor: '#334155', marginHorizontal: 4 },
  timeLabel:   { fontSize: 10, color: '#475569', marginBottom: 1 },
  timeValue:   { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  lateRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lateText:    { fontSize: 11, color: '#ea580c' },

  // States
  centerBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { color: '#475569', fontSize: 14 },
  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyText:    { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  emptySubText: { color: '#475569', fontSize: 13, textAlign: 'center', maxWidth: 260 },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  footerText:   { color: '#475569', fontSize: 13 },
  footerEnd:    { textAlign: 'center', color: '#334155', fontSize: 12, paddingVertical: 20 },
  errorBox:     {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 10,
    marginVertical: 10, padding: 12,
  },
  errorText:    { color: '#fca5a5', fontSize: 13, flex: 1 },
})
