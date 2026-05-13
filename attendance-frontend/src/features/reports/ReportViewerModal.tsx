import { useRef, useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { X, ChevronLeft, ChevronRight, ChevronDown, Copy, Download, Printer, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import XLSXStyle from 'xlsx-js-style'
import { toast } from 'sonner'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { reportsService, logDownload } from './reportsService'
import type { EmployeeDetailReport, ReportDay, ReportType } from '@/types/report'
import { isNative } from '@/utils/platform'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMins(mins?: number | null): string {
  if (mins == null) return '—'
  const sign = mins < 0 ? '-' : ''
  const abs  = Math.abs(mins)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  if (h === 0) return `${sign}${m}m`
  return `${sign}${h}h ${m}m`
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function reportTitle(type: string): string {
  switch (type) {
    case 'absences':         return 'REPORTE DE FALTAS'
    case 'lates':            return 'REPORTE DE RETARDOS'
    case 'early-departures': return 'REPORTE DE SALIDAS ANTES DE TIEMPO'
    case 'overtime':         return 'REPORTE DE HORAS EXTRAS'
    default:                 return 'REPORTE GENERAL DE ASISTENCIA'
  }
}

// ─── Day status badge ─────────────────────────────────────────────────────────

function DayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Asistido':                   'bg-green-100 text-green-700',
    'Retardo':                    'bg-yellow-100 text-yellow-700',
    'Falta':                      'bg-red-100 text-red-700',
    'Medio Día':                  'bg-blue-100 text-blue-700',
    'Descanso':                   'bg-gray-100 text-gray-500',
    'Sin registro':               'bg-gray-100 text-gray-400',
    'Inhábil':                    'bg-orange-100 text-orange-600',
    'Extraordinaria (feriado)':   'bg-purple-100 text-purple-700',
    'Extraordinaria (descanso)':  'bg-purple-100 text-purple-700',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

// ─── Report content (the actual printable/capturable content) ─────────────────

function ReportContent({
  report,
  fontSize,
  contentRef,
}: {
  report: EmployeeDetailReport
  fontSize: number
  contentRef: React.RefObject<HTMLDivElement>
}) {
  const showEntries = report.reportType === 'general'
  const isOvertime  = report.reportType === 'overtime'

  return (
    <div
      ref={contentRef}
      className="bg-white"
      style={{ fontSize, fontFamily: 'Arial, sans-serif', minWidth: 700 }}
    >
      {/* ── Header banner ───────────────────────────────────────────────── */}
      <div style={{ background: '#1e3a5f', color: 'white', padding: '18px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: fontSize + 4, fontWeight: 700, letterSpacing: 1 }}>
          {reportTitle(report.reportType)}
        </div>
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: fontSize + 1 }}>
          Período: {fmtDate(report.from)} — {fmtDate(report.to)}
        </div>
      </div>

      {/* ── Employee info ────────────────────────────────────────────────── */}
      <div style={{ background: '#f0f4f8', padding: '12px 24px', display: 'flex', gap: 40, flexWrap: 'wrap', borderBottom: '1px solid #cdd5df' }}>
        <InfoItem label="Empleado" value={report.employeeName} />
        <InfoItem label="Código"   value={report.employeeCode} />
        <InfoItem label="Depto."   value={report.department} />
        <InfoItem label="Horario"  value={report.scheduleName} />
      </div>

      {/* ── Days table ───────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <Th>Fecha</Th>
              <Th>Día</Th>
              {showEntries && <><Th>Entrada</Th><Th>Salida</Th><Th>Trabajado</Th></>}
              {isOvertime  && <><Th>Entrada</Th><Th>Salida</Th><Th>Programado</Th><Th>Trabajado</Th><Th>Noct. (25%)</Th><Th>Supl. (50%)</Th><Th>SupNoc. (100%)</Th><Th>Extrao. (100%)</Th></>}
              {!isOvertime && <><Th>Programado</Th><Th>Balance</Th></>}
              {report.reportType === 'lates'            && <Th>Retardo</Th>}
              {report.reportType === 'early-departures' && <Th>Anticipo</Th>}
              <Th>Estatus</Th>
            </tr>
          </thead>
          <tbody>
            {report.days.map((day, di) => (
              <DayRows
                key={day.date + di}
                day={day}
                reportType={report.reportType as ReportType}
                showEntries={showEntries}
                isOvertime={isOvertime}
                rowIndex={di}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Summary sections ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!isOvertime && (
          <>
            <SummaryBox title="Resumen del período" color="#1e3a5f">
              <SummaryRow label="Días laborables"     value={String(report.totalWorkdays)} />
              <SummaryRow label="Días asistidos"      value={String(report.workdaysAttended)} />
              <SummaryRow label="Faltas"              value={String(report.totalAbsences)} />
              <SummaryRow label="Retardos"            value={String(report.totalLates)} />
              <SummaryRow label="Salidas anticipadas" value={String(report.totalEarlyDepartures)} />
              <SummaryRow label="% Asistencia"        value={`${report.attendancePercent}%`} />
            </SummaryBox>
            <SummaryBox title="Tiempo (sin faltas)" color="#2e6b4f">
              <SummaryRow label="Trabajado"  value={fmtMins(report.totalWorkedMinutes)} />
              <SummaryRow label="Programado" value={fmtMins(report.scheduledMinutesNoAbsences)} />
              <SummaryRow label="Extras"     value={fmtMins(report.extraMinutesNoAbsences)} />
              <SummaryRow label="Balance"    value={fmtMins(report.balanceMinutesNoAbsences)} highlight />
            </SummaryBox>
            <SummaryBox title="Tiempo (con faltas)" color="#7b3f00">
              <SummaryRow label="Trabajado"  value={fmtMins(report.totalWorkedMinutes)} />
              <SummaryRow label="Programado" value={fmtMins(report.scheduledMinutesWithAbsences)} />
              <SummaryRow label="Extras"     value={fmtMins(report.extraMinutesWithAbsences)} />
              <SummaryRow label="Balance"    value={fmtMins(report.balanceMinutesWithAbsences)} highlight />
            </SummaryBox>
          </>
        )}

        {isOvertime && (
          <>
            <SummaryBox title="Resumen del período" color="#1e3a5f">
              <SummaryRow label="Días laborables" value={String(report.totalWorkdays)} />
              <SummaryRow label="Días asistidos"  value={String(report.workdaysAttended)} />
              <SummaryRow label="% Asistencia"    value={`${report.attendancePercent}%`} />
            </SummaryBox>
            <SummaryBox title="Horas extras (Art. 55)" color="#6d28d9">
              <SummaryRow label="Recargo nocturno (25%)"    value={fmtMins(report.totalNocturnalMinutes ?? 0)} />
              <SummaryRow label="Suplementaria (50%)"       value={fmtMins(report.totalSupplementaryMinutes ?? 0)} />
              <SummaryRow label="Supl. nocturna (100%)"     value={fmtMins(report.totalSupplementaryNightMinutes ?? 0)} />
              <SummaryRow label="Extraordinaria (100%)"     value={fmtMins(report.totalExtraordinaryMinutes ?? 0)} />
              <SummaryRow
                label="Total extras"
                value={fmtMins((report.totalSupplementaryMinutes ?? 0) + (report.totalSupplementaryNightMinutes ?? 0) + (report.totalExtraordinaryMinutes ?? 0))}
                highlight
              />
            </SummaryBox>
          </>
        )}
      </div>

      {/* ── Signature ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 32px', display: 'flex', justifyContent: 'space-around' }}>
        <SignatureLine label="Firma del empleado" />
        <SignatureLine label="Firma del supervisor" />
      </div>

      <div style={{ textAlign: 'center', fontSize: fontSize - 2, color: '#888', paddingBottom: 12 }}>
        Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}

// ─── Day rows (one summary row + optional entry sub-rows) ────────────────────

function DayRows({
  day,
  reportType,
  showEntries,
  isOvertime,
  rowIndex,
}: {
  day: ReportDay
  reportType: ReportType
  showEntries: boolean
  isOvertime: boolean
  rowIndex: number
}) {
  const bg = rowIndex % 2 === 0 ? '#fff' : '#f7f9fb'

  // Overtime row — una sola fila por día con todas las columnas de extras
  if (isOvertime) {
    const first = day.entries?.[0]
    const last  = day.entries?.[day.entries.length - 1]
    const hasOT = (day.nocturnalMinutes ?? 0) > 0 || (day.supplementaryMinutes ?? 0) > 0 ||
                  (day.supplementaryNightMinutes ?? 0) > 0 || (day.extraordinaryMinutes ?? 0) > 0
    return (
      <tr style={{ background: bg }}>
        <Td>{fmtDate(day.date)}</Td>
        <Td>{day.dayName}</Td>
        <Td>{fmtDateTime(first?.checkInTime)}</Td>
        <Td>{fmtDateTime(last?.checkOutTime)}</Td>
        <Td>{fmtMins(day.scheduledMinutes)}</Td>
        <Td>{fmtMins(day.totalWorkedMinutes)}</Td>
        <Td style={{ color: (day.nocturnalMinutes ?? 0) > 0 ? '#7c3aed' : '#bbb' }}>{fmtMins(day.nocturnalMinutes)}</Td>
        <Td style={{ color: (day.supplementaryMinutes ?? 0) > 0 ? '#b45309' : '#bbb' }}>{fmtMins(day.supplementaryMinutes)}</Td>
        <Td style={{ color: (day.supplementaryNightMinutes ?? 0) > 0 ? '#dc2626' : '#bbb' }}>{fmtMins(day.supplementaryNightMinutes)}</Td>
        <Td style={{ color: (day.extraordinaryMinutes ?? 0) > 0 ? '#dc2626' : '#bbb' }}>{fmtMins(day.extraordinaryMinutes)}</Td>
        <Td><DayStatusBadge status={hasOT ? day.dayStatus : 'Descanso'} /></Td>
      </tr>
    )
  }

  if (!day.isWorkDay) {
    return (
      <tr style={{ background: '#f0f0f0', color: '#aaa' }}>
        <Td>{fmtDate(day.date)}</Td>
        <Td>{day.dayName}</Td>
        {showEntries && <><Td>—</Td><Td>—</Td><Td>—</Td></>}
        <Td>—</Td><Td>—</Td>
        {reportType === 'lates'            && <Td>—</Td>}
        {reportType === 'early-departures' && <Td>—</Td>}
        <Td><DayStatusBadge status={day.dayStatus} /></Td>
      </tr>
    )
  }

  const hasMultiple = showEntries && day.entries.length > 1

  return (
    <>
      {/* Entry sub-rows (only for general/halfday when multiple entries) */}
      {showEntries && day.entries.map((entry, ei) => (
        <tr key={ei} style={{ background: bg, fontSize: '0.9em', color: '#555' }}>
          <Td>{ei === 0 ? fmtDate(day.date) : ''}</Td>
          <Td>{ei === 0 ? day.dayName : ''}</Td>
          <Td>{fmtDateTime(entry.checkInTime)}</Td>
          <Td>{fmtDateTime(entry.checkOutTime)}</Td>
          <Td>{fmtMins(entry.workedMinutes)}</Td>
          <Td>{ei === 0 ? fmtMins(day.scheduledMinutes) : ''}</Td>
          <Td>{ei === 0 ? fmtMins(day.balanceMinutes) : ''}</Td>
          {reportType === 'lates'            && <Td>{ei === 0 ? fmtMins(day.delayMinutes) : ''}</Td>}
          {reportType === 'early-departures' && <Td>{ei === 0 ? fmtMins(day.earlyLeaveMinutes) : ''}</Td>}
          <Td>{ei === 0 ? <DayStatusBadge status={day.dayStatus} /> : ''}</Td>
        </tr>
      ))}

      {/* Day summary row (bold) — always shown; for non-general types, it's the only row */}
      {(!showEntries || hasMultiple) && (
        <tr style={{ background: bg, fontWeight: hasMultiple ? 700 : 400 }}>
          <Td>{fmtDate(day.date)}</Td>
          <Td>{day.dayName}</Td>
          {showEntries && (
            <>
              <Td colSpan={3} style={{ textAlign: 'center', fontSize: '0.85em', color: '#666' }}>
                {day.entries.length} registros — total trabajado: {fmtMins(day.totalWorkedMinutes)}
              </Td>
            </>
          )}
          {!showEntries && (
            <>
              <Td>{fmtMins(day.scheduledMinutes)}</Td>
              <Td>{fmtMins(day.balanceMinutes)}</Td>
              {reportType === 'lates'            && <Td>{fmtMins(day.delayMinutes)}</Td>}
              {reportType === 'early-departures' && <Td>{fmtMins(day.earlyLeaveMinutes)}</Td>}
              <Td><DayStatusBadge status={day.dayStatus} /></Td>
            </>
          )}
          {showEntries && hasMultiple && (
            <>
              <Td>{fmtMins(day.scheduledMinutes)}</Td>
              <Td>{fmtMins(day.balanceMinutes)}</Td>
              {reportType === 'lates'            && <Td>{fmtMins(day.delayMinutes)}</Td>}
              {reportType === 'early-departures' && <Td>{fmtMins(day.earlyLeaveMinutes)}</Td>}
              <Td><DayStatusBadge status={day.dayStatus} /></Td>
            </>
          )}
        </tr>
      )}
    </>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: '0.85em', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function Td({ children, colSpan, style }: { children?: React.ReactNode; colSpan?: number; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '5px 10px', borderBottom: '1px solid #e8ecf0', verticalAlign: 'middle', ...style }} colSpan={colSpan}>
      {children}
    </td>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75em', color: '#666', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function SummaryBox({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 180px', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden', minWidth: 180 }}>
      <div style={{ background: color, color: 'white', padding: '6px 12px', fontWeight: 600, fontSize: '0.85em' }}>{title}</div>
      <div style={{ padding: '8px 12px' }}>{children}</div>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f0f0f0', fontWeight: highlight ? 700 : 400 }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 200 }}>
      <div style={{ borderBottom: '1px solid #999', marginBottom: 6, height: 40 }} />
      <div style={{ fontSize: '0.8em', color: '#666' }}>{label}</div>
    </div>
  )
}

// ─── Excel builder (styled with xlsx-js-style) ───────────────────────────────

// hex sin # para xlsx-js-style
const XL = {
  DARK:  '1e3a5f',
  GREEN: '2e6b4f',
  BROWN: '7b3f00',
  INFO:  'f0f4f8',
  ALT:   'f7f9fb',
  REST:  'f0f0f0',
  WHITE: 'ffffff',
  GRAY:  '666666',
  LGRAY: 'aaaaaa',
}

type CellStyle = {
  fill?:      { fgColor: { rgb: string } }
  font?:      { bold?: boolean; sz?: number; color?: { rgb: string } }
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean }
  border?:    { bottom?: { style: string; color: { rgb: string } } }
}

function makeCell(v: string | number, s?: CellStyle) {
  return { v, t: 's', s }
}

function buildExcelSheet(report: EmployeeDetailReport): XLSXStyle.WorkSheet {
  const showEntries = report.reportType === 'general'
  const isOvertime  = report.reportType === 'overtime'

  const titleS: CellStyle = { fill: { fgColor: { rgb: XL.DARK } }, font: { bold: true, sz: 13, color: { rgb: XL.WHITE } }, alignment: { horizontal: 'center' } }
  const hdrS: CellStyle   = { fill: { fgColor: { rgb: XL.DARK } }, font: { bold: true, color: { rgb: XL.WHITE } }, alignment: { horizontal: 'center' } }
  const infoLS: CellStyle = { fill: { fgColor: { rgb: XL.INFO } }, font: { bold: true } }
  const infoVS: CellStyle = { fill: { fgColor: { rgb: XL.INFO } } }
  const sigS: CellStyle   = { border: { bottom: { style: 'thin', color: { rgb: '999999' } } }, alignment: { horizontal: 'center' } }
  const sigLS: CellStyle  = { font: { color: { rgb: XL.GRAY } }, alignment: { horizontal: 'center' } }
  const dateS: CellStyle  = { font: { color: { rgb: XL.LGRAY } }, alignment: { horizontal: 'center' } }
  const sumHS = (rgb: string): CellStyle => ({ fill: { fgColor: { rgb } }, font: { bold: true, color: { rgb: XL.WHITE } } })
  const altS  = (i: number, isWork: boolean): CellStyle => ({
    fill: { fgColor: { rgb: !isWork ? XL.REST : i % 2 === 0 ? XL.WHITE : XL.ALT } },
    ...(!isWork ? { font: { color: { rgb: XL.GRAY } } } : {}),
  })

  type Row = ReturnType<typeof makeCell>[]
  const aoa: Row[] = []
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = []

  // Helper: agrega fila y registra merge si se pide
  const push = (row: Row, mergeSpan?: number) => {
    const r = aoa.length
    if (mergeSpan && mergeSpan > 1) merges.push({ s: { r, c: 0 }, e: { r, c: mergeSpan - 1 } })
    aoa.push(row)
  }

  const headers = isOvertime
    ? ['Fecha', 'Día', 'Entrada', 'Salida', 'Programado', 'Trabajado', 'Noct. (25%)', 'Supl. (50%)', 'SupNoc. (100%)', 'Extrao. (100%)', 'Estatus']
    : ['Fecha', 'Día',
        ...(showEntries ? ['Entrada', 'Salida', 'Trabajado'] : []),
        'Programado', 'Balance',
        ...(report.reportType === 'lates'            ? ['Retardo']  : []),
        ...(report.reportType === 'early-departures' ? ['Anticipo'] : []),
        'Estatus',
      ]
  const nc = headers.length
  const fullCols = Math.max(nc, 8)
  const empty = () => Array(fullCols).fill(null).map(() => makeCell('')) as Row

  // Título y período — merge ancho completo (fullCols para que cubra también el ancho del resumen)
  push([makeCell(reportTitle(report.reportType), titleS)], fullCols)
  push([makeCell(`Período: ${fmtDate(report.from)} — ${fmtDate(report.to)}`, { alignment: { horizontal: 'center' }, font: { color: { rgb: XL.GRAY } } })], fullCols)
  push(empty())

  // Info empleado — siempre 8 celdas (4 pares label/valor) para cubrir fullCols
  push([
    makeCell('Empleado:', infoLS), makeCell(report.employeeName, infoVS),
    makeCell('Código:',   infoLS), makeCell(report.employeeCode,  infoVS),
    makeCell('Depto.:',   infoLS), makeCell(report.department,    infoVS),
    makeCell('Horario:',  infoLS), makeCell(report.scheduleName,  infoVS),
  ])

  push(empty())
  push(headers.map(h => makeCell(h, hdrS)))

  // Filas de datos
  let ri = 0
  for (const day of report.days) {
    const s = altS(ri, day.isWorkDay)

    if (isOvertime) {
      const first = day.entries?.[0]
      const last  = day.entries?.[day.entries.length - 1]
      push([
        makeCell(fmtDate(day.date), s),
        makeCell(day.dayName, s),
        makeCell(fmtDateTime(first?.checkInTime), s),
        makeCell(fmtDateTime(last?.checkOutTime), s),
        makeCell(fmtMins(day.scheduledMinutes), s),
        makeCell(fmtMins(day.totalWorkedMinutes), s),
        makeCell(fmtMins(day.nocturnalMinutes), s),
        makeCell(fmtMins(day.supplementaryMinutes), s),
        makeCell(fmtMins(day.supplementaryNightMinutes), s),
        makeCell(fmtMins(day.extraordinaryMinutes), s),
        makeCell(day.dayStatus, s),
      ])
    } else if (showEntries && day.entries.length > 0) {
      day.entries.forEach((entry, ei) => {
        push([
          makeCell(ei === 0 ? fmtDate(day.date) : '', s),
          makeCell(ei === 0 ? day.dayName        : '', s),
          makeCell(fmtDateTime(entry.checkInTime),    s),
          makeCell(fmtDateTime(entry.checkOutTime),   s),
          makeCell(fmtMins(entry.workedMinutes),      s),
          makeCell(ei === 0 ? fmtMins(day.scheduledMinutes) : '', s),
          makeCell(ei === 0 ? fmtMins(day.balanceMinutes)   : '', s),
          makeCell(ei === 0 ? day.dayStatus                 : '', s),
        ])
      })
    } else {
      const row: Row = [makeCell(fmtDate(day.date), s), makeCell(day.dayName, s)]
      if (showEntries) row.push(makeCell('', s), makeCell('', s), makeCell('', s))
      row.push(makeCell(fmtMins(day.scheduledMinutes), s), makeCell(fmtMins(day.balanceMinutes), s))
      if (report.reportType === 'lates')            row.push(makeCell(fmtMins(day.delayMinutes),      s))
      if (report.reportType === 'early-departures') row.push(makeCell(fmtMins(day.earlyLeaveMinutes), s))
      row.push(makeCell(day.dayStatus, s))
      push(row)
    }
    ri++
  }

  const lS: CellStyle = { font: { color: { rgb: XL.GRAY } } }
  const bS: CellStyle = { font: { bold: true } }
  const mkRow = (n: number) => Array(n).fill(null).map(() => makeCell('')) as Row

  push(mkRow(fullCols))

  if (isOvertime) {
    // Resumen overtime — 2 secciones: período + horas extras
    const periodoItems = [
      { label: 'Días laborables', value: String(report.totalWorkdays) },
      { label: 'Días asistidos',  value: String(report.workdaysAttended) },
      { label: '% Asistencia',    value: `${report.attendancePercent}%`, bold: true },
    ]
    const PURPLE = '6d28d9'
    const extraItems = [
      { label: 'Recargo nocturno (25%)',  value: fmtMins(report.totalNocturnalMinutes ?? 0) },
      { label: 'Suplementaria (50%)',     value: fmtMins(report.totalSupplementaryMinutes ?? 0) },
      { label: 'Supl. nocturna (100%)',   value: fmtMins(report.totalSupplementaryNightMinutes ?? 0) },
      { label: 'Extraordinaria (100%)',   value: fmtMins(report.totalExtraordinaryMinutes ?? 0) },
      { label: 'Total extras',            value: fmtMins((report.totalSupplementaryMinutes ?? 0) + (report.totalSupplementaryNightMinutes ?? 0) + (report.totalExtraordinaryMinutes ?? 0)), bold: true },
    ]
    const maxOTRows = Math.max(periodoItems.length, extraItems.length)

    const rHdr = aoa.length
    const hdrRow = mkRow(fullCols)
    hdrRow[0] = makeCell('RESUMEN DEL PERÍODO', sumHS(XL.DARK));  hdrRow[1] = makeCell('', sumHS(XL.DARK))
    hdrRow[3] = makeCell('HORAS EXTRAS (Art. 55)', sumHS(PURPLE)); hdrRow[4] = makeCell('', sumHS(PURPLE))
    aoa.push(hdrRow)
    merges.push({ s: { r: rHdr, c: 0 }, e: { r: rHdr, c: 1 } })
    merges.push({ s: { r: rHdr, c: 3 }, e: { r: rHdr, c: 4 } })

    for (let i = 0; i < maxOTRows; i++) {
      const row = mkRow(fullCols)
      if (i < periodoItems.length) { const d = periodoItems[i]; row[0] = makeCell(d.label, lS); row[1] = makeCell(d.value, d.bold ? bS : undefined) }
      if (i < extraItems.length)   { const d = extraItems[i];   row[3] = makeCell(d.label, lS); row[4] = makeCell(d.value, d.bold ? bS : undefined) }
      aoa.push(row)
    }
  } else {
    // Resumen estándar — 3 secciones lado a lado
    const resumenItems = [
      { label: 'Días laborables',     value: String(report.totalWorkdays) },
      { label: 'Días asistidos',      value: String(report.workdaysAttended) },
      { label: 'Faltas',              value: String(report.totalAbsences) },
      { label: 'Retardos',            value: String(report.totalLates) },
      { label: 'Salidas anticipadas', value: String(report.totalEarlyDepartures) },
      { label: '% Asistencia',        value: `${report.attendancePercent}%`, bold: true },
    ]
    const sinItems = [
      { label: 'Trabajado',  value: fmtMins(report.totalWorkedMinutes) },
      { label: 'Programado', value: fmtMins(report.scheduledMinutesNoAbsences) },
      { label: 'Balance',    value: fmtMins(report.balanceMinutesNoAbsences), bold: true },
    ]
    const conItems = [
      { label: 'Trabajado',  value: fmtMins(report.totalWorkedMinutes) },
      { label: 'Programado', value: fmtMins(report.scheduledMinutesWithAbsences) },
      { label: 'Balance',    value: fmtMins(report.balanceMinutesWithAbsences), bold: true },
    ]
    const maxSumRows = Math.max(resumenItems.length, sinItems.length, conItems.length)

    const rHdr = aoa.length
    const hdrRow = mkRow(fullCols)
    hdrRow[0] = makeCell('RESUMEN DEL PERÍODO', sumHS(XL.DARK));  hdrRow[1] = makeCell('', sumHS(XL.DARK))
    hdrRow[3] = makeCell('TIEMPO (SIN FALTAS)', sumHS(XL.GREEN)); hdrRow[4] = makeCell('', sumHS(XL.GREEN))
    hdrRow[6] = makeCell('TIEMPO (CON FALTAS)', sumHS(XL.BROWN)); hdrRow[7] = makeCell('', sumHS(XL.BROWN))
    aoa.push(hdrRow)
    merges.push({ s: { r: rHdr, c: 0 }, e: { r: rHdr, c: 1 } })
    merges.push({ s: { r: rHdr, c: 3 }, e: { r: rHdr, c: 4 } })
    merges.push({ s: { r: rHdr, c: 6 }, e: { r: rHdr, c: 7 } })

    for (let i = 0; i < maxSumRows; i++) {
      const row = mkRow(fullCols)
      if (i < resumenItems.length) { const d = resumenItems[i]; row[0] = makeCell(d.label, lS); row[1] = makeCell(d.value, d.bold ? bS : undefined) }
      if (i < sinItems.length)     { const d = sinItems[i];     row[3] = makeCell(d.label, lS); row[4] = makeCell(d.value, d.bold ? bS : undefined) }
      if (i < conItems.length)     { const d = conItems[i];     row[6] = makeCell(d.label, lS); row[7] = makeCell(d.value, d.bold ? bS : undefined) }
      aoa.push(row)
    }
  }

  push(mkRow(fullCols))
  push(mkRow(fullCols))

  // Firmas — dos bloques sobre el ancho completo
  const sig1 = Math.max(2, Math.floor(fullCols / 2) - 1)
  const sig2 = fullCols - sig1 - 1
  const gap  = 1

  const rSigLine = aoa.length
  const sigLineRow = mkRow(fullCols)
  sigLineRow[0]          = makeCell('', sigS)
  sigLineRow[sig1 + gap] = makeCell('', sigS)
  aoa.push(sigLineRow)
  merges.push({ s: { r: rSigLine, c: 0 },          e: { r: rSigLine, c: sig1 - 1 } })
  merges.push({ s: { r: rSigLine, c: sig1 + gap },  e: { r: rSigLine, c: sig1 + gap + sig2 - 1 } })

  const rSigLabel = aoa.length
  const sigLabelRow = mkRow(fullCols)
  sigLabelRow[0]          = makeCell('Firma del empleado',   sigLS)
  sigLabelRow[sig1 + gap] = makeCell('Firma del supervisor', sigLS)
  aoa.push(sigLabelRow)
  merges.push({ s: { r: rSigLabel, c: 0 },          e: { r: rSigLabel, c: sig1 - 1 } })
  merges.push({ s: { r: rSigLabel, c: sig1 + gap },  e: { r: rSigLabel, c: sig1 + gap + sig2 - 1 } })

  aoa.push(mkRow(fullCols))
  const rDate = aoa.length
  aoa.push([makeCell(`Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, dateS)])
  merges.push({ s: { r: rDate, c: 0 }, e: { r: rDate, c: fullCols - 1 } })

  // Worksheet
  const ws = XLSXStyle.utils.aoa_to_sheet(aoa)
  ws['!merges'] = merges

  const headerWidths: Record<string, number> = {
    'Fecha': 12, 'Día': 13, 'Entrada': 14, 'Salida': 14,
    'Trabajado': 12, 'Programado': 14, 'Balance': 12,
    'Retardo': 12, 'Anticipo': 12, 'Estatus': 20,
    'Noct. (25%)': 13, 'Supl. (50%)': 13, 'SupNoc. (100%)': 15, 'Extrao. (100%)': 15,
  }
  ws['!cols'] = Array(fullCols).fill(0).map((_, i) => ({
    wch: i < headers.length ? (headerWidths[headers[i]] ?? 12) : 10,
  }))

  return ws
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  employeeCodes: string[]   // ordered list to navigate
  initialCode:   string
  from:          string
  to:            string
  reportType:    ReportType
  onClose:       () => void
}

export default function ReportViewerModal({ employeeCodes, initialCode, from, to, reportType, onClose }: Props) {
  const [currentCode, setCurrentCode] = useState(initialCode)
  const [report,      setReport]      = useState<EmployeeDetailReport | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [fontSize,    setFontSize]    = useState(13)
  const [copying,      setCopying]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [printing,     setPrinting]     = useState(false)
  const [sharing,      setSharing]      = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf')
  const [formatOpen,   setFormatOpen]   = useState(false)
  const contentRef = useRef<HTMLDivElement>(null!)

  const currentIndex = employeeCodes.indexOf(currentCode)
  const total        = employeeCodes.length

  const loadReport = useCallback(async (code: string) => {
    setLoading(true)
    setReport(null)
    try {
      const data = await reportsService.getEmployeeDetail(code, from, to, reportType)
      setReport(data)
    } catch {
      // keep null
    } finally {
      setLoading(false)
    }
  }, [from, to, reportType])

  useEffect(() => { loadReport(currentCode) }, [currentCode, loadReport])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const prev = () => {
    if (currentIndex > 0) setCurrentCode(employeeCodes[currentIndex - 1])
  }
  const next = () => {
    if (currentIndex < total - 1) setCurrentCode(employeeCodes[currentIndex + 1])
  }

  const captureCanvas = async () => {
    if (!contentRef.current) return null
    return html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' })
  }

  const handleCopy = async () => {
    setCopying(true)
    try {
      const canvas = await captureCanvas()
      if (!canvas) return
      canvas.toBlob(async blob => {
        if (!blob) return
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        } catch {
          // fallback: open in new tab
          window.open(canvas.toDataURL())
        }
      })
    } finally {
      setCopying(false)
    }
  }

  const shareFileNative = async (base64: string, fileName: string) => {
    try {
      await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache, recursive: true })
    } catch (e) { throw new Error(`WriteFile: ${e}`) }

    let uri = ''
    try {
      const r = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
      uri = r.uri
    } catch (e) { throw new Error(`GetUri: ${e}`) }

    try {
      await Share.share({ title: fileName, url: uri, dialogTitle: 'Guardar o compartir' })
    } catch (e) {
      // El usuario canceló el diálogo — no es un error real
      const msg = String(e).toLowerCase()
      if (msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss')) return
      throw new Error(`Share: ${e}`)
    }
  }

  // Dibuja una página de reporte en el pdf recibido (sin html2canvas — funciona en web y WebView)
  const buildReportPage = (pdf: jsPDF, empReport: EmployeeDetailReport): void => {
    const pageW  = pdf.internal.pageSize.getWidth()
    const pageH  = pdf.internal.pageSize.getHeight()
    const mg     = 28
    const cw     = pageW - mg * 2
    const DARK   = [30, 58, 95]   as [number,number,number]
    const GREEN  = [46, 107, 79]  as [number,number,number]
    const BROWN  = [123, 63, 0]   as [number,number,number]
    const PURPLE = [109, 40, 217] as [number,number,number]
    const LIGHT  = [240,244,248]  as [number,number,number]
    const ALT    = [247,249,251]  as [number,number,number]
    let y = mg

    const checkPage = (need = 20) => {
      if (y + need > pageH - mg) { pdf.addPage(); y = mg }
    }

    // ── Encabezado ──────────────────────────────────────────────────────────
    pdf.setFillColor(...DARK)
    pdf.rect(mg, y, cw, 36, 'F')
    pdf.setTextColor(255,255,255)
    pdf.setFontSize(13)
    pdf.setFont('helvetica','bold')
    pdf.text(reportTitle(empReport.reportType), pageW/2, y+14, { align:'center' })
    pdf.setFontSize(9)
    pdf.setFont('helvetica','normal')
    pdf.text(`Período: ${fmtDate(empReport.from)} — ${fmtDate(empReport.to)}`, pageW/2, y+28, { align:'center' })
    y += 40

    // ── Info empleado ────────────────────────────────────────────────────────
    pdf.setFillColor(...LIGHT)
    pdf.rect(mg, y, cw, 28, 'F')
    pdf.setTextColor(60,60,60)
    pdf.setFontSize(8)
    pdf.setFont('helvetica','normal')
    pdf.text(`Empleado: ${empReport.employeeName}`,  mg+4, y+10)
    pdf.text(`Código: ${empReport.employeeCode}`,     mg+4, y+21)
    pdf.text(`Depto.: ${empReport.department}`,       mg+cw/2+4, y+10)
    pdf.text(`Horario: ${empReport.scheduleName}`,    mg+cw/2+4, y+21)
    y += 32

    // ── Tabla ────────────────────────────────────────────────────────────────
    const isOT   = empReport.reportType === 'overtime'
    const showEn = empReport.reportType === 'general'
    const hdrs   = isOT
      ? ['Fecha','Día','Entrada','Salida','Trabaj.','Estatus']
      : showEn
        ? ['Fecha','Día','Entrada','Salida','Trabaj.','Program.','Balance','Estatus']
        : ['Fecha','Día','Program.','Balance','Estatus']
    const ww  = cw / hdrs.length
    const ROW = 14

    pdf.setFillColor(...DARK)
    pdf.rect(mg, y, cw, ROW+2, 'F')
    pdf.setTextColor(255,255,255)
    pdf.setFont('helvetica','bold')
    pdf.setFontSize(7.5)
    hdrs.forEach((h,i) => pdf.text(h, mg + ww*i + 2, y+10))
    y += ROW+2

    empReport.days.forEach((day, di) => {
      checkPage(ROW+2)
      const bg = di % 2 === 0 ? [255,255,255] as [number,number,number] : ALT
      pdf.setFillColor(...bg)
      pdf.rect(mg, y, cw, ROW, 'F')
      pdf.setTextColor(60,60,60)
      pdf.setFont('helvetica','normal')
      pdf.setFontSize(7)
      const first = day.entries?.[0]
      const last  = day.entries?.[day.entries.length-1]
      const cells = isOT
        ? [fmtDate(day.date), day.dayName, fmtDateTime(first?.checkInTime), fmtDateTime(last?.checkOutTime), fmtMins(day.totalWorkedMinutes), day.dayStatus]
        : showEn
          ? [fmtDate(day.date), day.dayName, fmtDateTime(first?.checkInTime), fmtDateTime(last?.checkOutTime), fmtMins(day.totalWorkedMinutes), fmtMins(day.scheduledMinutes), fmtMins(day.balanceMinutes), day.dayStatus]
          : [fmtDate(day.date), day.dayName, fmtMins(day.scheduledMinutes), fmtMins(day.balanceMinutes), day.dayStatus]
      cells.forEach((c,i) => pdf.text(String(c ?? '—').slice(0,20), mg + ww*i + 2, y+10))
      y += ROW
    })
    y += 14

    // ── Resumen (cajas lado a lado) ──────────────────────────────────────────
    const GAP  = 4
    const ROWH = 12

    const drawBox = (bx: number, bw: number, color: [number,number,number], title: string, rows: [string,string][]) => {
      pdf.setFillColor(...color)
      pdf.rect(bx, y, bw, 14, 'F')
      pdf.setTextColor(255,255,255)
      pdf.setFont('helvetica','bold')
      pdf.setFontSize(6.5)
      pdf.text(title, bx+3, y+10)
      rows.forEach((row, ri) => {
        const ry = y + 14 + ri * ROWH
        pdf.setFillColor(...(ri%2===0 ? [255,255,255] as [number,number,number] : ALT))
        pdf.rect(bx, ry, bw, ROWH, 'F')
        pdf.setTextColor(80,80,80)
        pdf.setFont('helvetica','normal')
        pdf.setFontSize(7)
        pdf.text(row[0], bx+3, ry+9)
        pdf.text(row[1], bx+bw-3, ry+9, { align:'right' })
      })
    }

    if (isOT) {
      const BOX1 = (cw - GAP) * 0.38
      const BOX2 = cw - BOX1 - GAP
      const periodoRows: [string,string][] = [
        ['Días laborables', String(empReport.totalWorkdays)],
        ['Días asistidos',  String(empReport.workdaysAttended)],
        ['% Asistencia',    `${empReport.attendancePercent}%`],
      ]
      const extraRows: [string,string][] = [
        ['Recargo nocturno (25%)',  fmtMins(empReport.totalNocturnalMinutes ?? 0)],
        ['Suplementaria (50%)',     fmtMins(empReport.totalSupplementaryMinutes ?? 0)],
        ['Supl. nocturna (100%)',   fmtMins(empReport.totalSupplementaryNightMinutes ?? 0)],
        ['Extraordinaria (100%)',   fmtMins(empReport.totalExtraordinaryMinutes ?? 0)],
        ['Total extras',            fmtMins((empReport.totalSupplementaryMinutes ?? 0) + (empReport.totalSupplementaryNightMinutes ?? 0) + (empReport.totalExtraordinaryMinutes ?? 0))],
      ]
      checkPage(14 + Math.max(periodoRows.length, extraRows.length) * ROWH + 20)
      drawBox(mg,           BOX1, DARK,   'RESUMEN DEL PERÍODO',    periodoRows)
      drawBox(mg+BOX1+GAP,  BOX2, PURPLE, 'HORAS EXTRAS (Art. 55)', extraRows)
      y += 14 + Math.max(periodoRows.length, extraRows.length) * ROWH + 16
    } else {
      const BOX = (cw - GAP*2) / 3
      const box1: [string,string][] = [
        ['Días laborables',     String(empReport.totalWorkdays)],
        ['Días asistidos',      String(empReport.workdaysAttended)],
        ['Faltas',              String(empReport.totalAbsences)],
        ['Retardos',            String(empReport.totalLates)],
        ['Salidas anticipadas', String(empReport.totalEarlyDepartures)],
        ['% Asistencia',        `${empReport.attendancePercent}%`],
      ]
      const box2: [string,string][] = [
        ['Trabajado',  fmtMins(empReport.totalWorkedMinutes)],
        ['Programado', fmtMins(empReport.scheduledMinutesNoAbsences)],
        ['Extras',     fmtMins(empReport.extraMinutesNoAbsences)],
        ['Balance',    fmtMins(empReport.balanceMinutesNoAbsences)],
      ]
      const box3: [string,string][] = [
        ['Trabajado',  fmtMins(empReport.totalWorkedMinutes)],
        ['Programado', fmtMins(empReport.scheduledMinutesWithAbsences)],
        ['Extras',     fmtMins(empReport.extraMinutesWithAbsences)],
        ['Balance',    fmtMins(empReport.balanceMinutesWithAbsences)],
      ]
      const maxR = Math.max(box1.length, box2.length, box3.length)
      checkPage(14 + maxR * ROWH + 20)
      drawBox(mg,              BOX, DARK,  'RESUMEN DEL PERÍODO', box1)
      drawBox(mg+BOX+GAP,      BOX, GREEN, 'TIEMPO (SIN FALTAS)', box2)
      drawBox(mg+BOX*2+GAP*2,  BOX, BROWN, 'TIEMPO (CON FALTAS)', box3)
      y += 14 + maxR * ROWH + 16
    }

    // ── Firmas ───────────────────────────────────────────────────────────────
    checkPage(50)
    const half = cw/2 - 20
    pdf.setDrawColor(150,150,150)
    pdf.line(mg, y+20, mg+half, y+20)
    pdf.line(mg+half+40, y+20, mg+cw, y+20)
    pdf.setFontSize(7.5)
    pdf.setTextColor(120,120,120)
    pdf.text('Firma del empleado',   mg + half/2,         y+30, { align:'center' })
    pdf.text('Firma del supervisor', mg + half+40+half/2, y+30, { align:'center' })

    pdf.setFontSize(7)
    pdf.text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, pageW/2, pageH-12, { align:'center' })
  }


  const handleSavePdf = async () => {
    setSaving(true)
    try {
      const cache: Record<string, EmployeeDetailReport> = {}
      if (report) cache[currentCode] = report
      for (const code of employeeCodes) {
        if (!cache[code]) cache[code] = await reportsService.getEmployeeDetail(code, from, to, reportType)
      }
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      employeeCodes.forEach((code, i) => {
        if (i > 0) pdf.addPage()
        buildReportPage(pdf, cache[code])
      })
      const safe = (employeeCodes[0] ?? 'reporte').replace(/[^a-zA-Z0-9-_]/g, '_')
      const fileName = employeeCodes.length === 1
        ? `reporte-${safe}-${from}.pdf`
        : `reportes-${from}-${to}.pdf`

      if (isNative) {
        const ab  = pdf.output('arraybuffer') as ArrayBuffer
        const u8  = new Uint8Array(ab)
        let   bin = ''
        for (let i = 0; i < u8.length; i += 8192) {
          bin += String.fromCharCode(...Array.from(u8.slice(i, i + 8192)))
        }
        const b64 = btoa(bin)
        if (!b64) throw new Error('PDF base64 vacío')
        await shareFileNative(b64, fileName)
      } else {
        pdf.save(fileName)
      }
      logDownload(reportType, 'pdf', from, to, employeeCodes.length === 1 ? employeeCodes[0] : undefined)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('PDF error:', msg)
      toast.error(msg, { duration: 10000 })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExcel = async () => {
    setSaving(true)
    try {
      const cache: Record<string, EmployeeDetailReport> = {}
      if (report) cache[currentCode] = report
      for (const code of employeeCodes) {
        if (!cache[code]) cache[code] = await reportsService.getEmployeeDetail(code, from, to, reportType)
      }
      const wb = XLSXStyle.utils.book_new()
      for (const code of employeeCodes) {
        XLSXStyle.utils.book_append_sheet(wb, buildExcelSheet(cache[code]), code.slice(0, 31))
      }
      const fileName = employeeCodes.length === 1
        ? `reporte-${employeeCodes[0]}-${from}.xlsx`
        : `reportes-${from}-${to}.xlsx`

      if (isNative) {
        const bin = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' }) as string
        const b64 = btoa(bin)
        if (!b64) throw new Error('Excel base64 vacío')
        const safe = (employeeCodes[0] ?? 'reporte').replace(/[^a-zA-Z0-9-_]/g, '_')
        const safeFileName = employeeCodes.length === 1
          ? `reporte-${safe}-${from}.xlsx`
          : `reportes-${from}-${to}.xlsx`
        await shareFileNative(b64, safeFileName)
      } else {
        XLSXStyle.writeFile(wb, fileName)
      }
      logDownload(reportType, 'excel', from, to, employeeCodes.length === 1 ? employeeCodes[0] : undefined)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Excel error:', msg)
      toast.error(msg, { duration: 10000 })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    if (isNative) {
      setSharing(true)
      try {
        if (!report) throw new Error('Sin reporte')
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
        buildReportPage(pdf, report)
        const ab  = pdf.output('arraybuffer') as ArrayBuffer
        const u8  = new Uint8Array(ab)
        let   bin = ''
        for (let i = 0; i < u8.length; i += 8192) {
          bin += String.fromCharCode(...Array.from(u8.slice(i, i + 8192)))
        }
        const b64  = btoa(bin)
        if (!b64) throw new Error('PDF base64 vacío')
        const safe = currentCode.replace(/[^a-zA-Z0-9-_]/g, '_')
        await shareFileNative(b64, `reporte-${safe}-${from}.pdf`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Share error:', msg)
        toast.error(msg, { duration: 10000 })
      } finally {
        setSharing(false)
      }
      return
    }

    setPrinting(true)
    try {
      const cache: Record<string, EmployeeDetailReport> = {}
      if (report) cache[currentCode] = report
      for (const code of employeeCodes) {
        if (!cache[code]) cache[code] = await reportsService.getEmployeeDetail(code, from, to, reportType)
      }
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return
      printWindow.document.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Reporte de Asistencia</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: white; }
          .page-break { page-break-after: always; }
          @media print { .page-break:last-child { page-break-after: avoid; } }
        </style>
      </head><body><div id="print-root"></div></body></html>`)
      printWindow.document.close()
      const rootEl = printWindow.document.getElementById('print-root')!
      const root = createRoot(rootEl)
      root.render(
        <>
          {employeeCodes.map((code, i) => (
            <div key={code} className={i < employeeCodes.length - 1 ? 'page-break' : ''}>
              <ReportContent report={cache[code]} fontSize={13} contentRef={{ current: null! }} />
            </div>
          ))}
        </>
      )
      requestAnimationFrame(() => requestAnimationFrame(() => { printWindow.focus(); printWindow.print() }))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">

          {/* ── Toolbar ───────────────────────────────────────────────────── */}
          <div className="border-b border-gray-200 shrink-0 bg-gray-50 rounded-t-xl">

            {/* Fila 1: nombre + cerrar — siempre visible */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              {total > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={prev} disabled={currentIndex <= 0}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors" title="Anterior">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 min-w-[55px] text-center">{currentIndex + 1}/{total}</span>
                  <button onClick={next} disabled={currentIndex >= total - 1}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors" title="Siguiente">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex-1 truncate text-sm font-medium text-gray-700">
                {report ? `${report.employeeName} — ${report.employeeCode}` : 'Cargando…'}
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-200 transition-colors shrink-0" title="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fila 2: acciones */}
            <div className="flex items-center gap-1 px-4 pb-2.5">
              {/* Font size */}
              <button onClick={() => setFontSize(s => Math.max(10, s - 1))}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors" title="Texto más pequeño">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => setFontSize(s => Math.min(18, s + 1))}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors" title="Texto más grande">
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-gray-300 mx-1" />

              {/* Copy — ícono en móvil, texto en desktop */}
              <button onClick={handleCopy} disabled={copying || !report}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors" title="Copiar imagen">
                {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">Copiar</span>
              </button>

              {/* Download — split button, ícono en móvil, texto en desktop */}
              <div className="relative flex items-stretch">
                <button onClick={exportFormat === 'pdf' ? handleSavePdf : handleSaveExcel}
                  disabled={saving || !report}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors rounded-l-lg"
                  title={exportFormat === 'pdf' ? 'Guardar PDF' : 'Guardar Excel'}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                </button>
                <button onClick={() => setFormatOpen(v => !v)} disabled={saving || !report}
                  className="flex items-center px-1.5 bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 transition-colors rounded-r-lg border-l border-primary-500"
                  title="Cambiar formato">
                  <ChevronDown className="w-3 h-3" />
                </button>
                {formatOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFormatOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[90px] overflow-hidden">
                      {(['pdf', 'excel'] as const).map(fmt => (
                        <button key={fmt} onClick={() => { setExportFormat(fmt); setFormatOpen(false) }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${exportFormat === fmt ? 'font-semibold text-primary-600' : 'text-gray-700'}`}>
                          {fmt === 'pdf' ? 'PDF' : 'Excel'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Imprimir — solo visible en desktop */}
              <button onClick={handlePrint} disabled={sharing || printing || !report}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
                title="Imprimir">
                {(sharing || printing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Imprimir
              </button>
            </div>
          </div>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                <span>Cargando reporte…</span>
              </div>
            ) : !report ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <span>No se pudo cargar el reporte.</span>
              </div>
            ) : (
              <ReportContent report={report} fontSize={fontSize} contentRef={contentRef} />
            )}
          </div>
        </div>
      </div>

    </>
  )
}
