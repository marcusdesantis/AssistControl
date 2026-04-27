import { useRef, useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { X, ChevronLeft, ChevronRight, Copy, Download, Printer, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { reportsService } from './reportsService'
import type { EmployeeDetailReport, ReportDay, ReportType } from '@/types/report'

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
    case 'halfday':          return 'REPORTE DE INCAPACIDAD / MEDIO DÍA'
    default:                 return 'REPORTE GENERAL DE ASISTENCIA'
  }
}

// ─── Day status badge ─────────────────────────────────────────────────────────

function DayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Asistido':   'bg-green-100 text-green-700',
    'Retardo':    'bg-yellow-100 text-yellow-700',
    'Falta':      'bg-red-100 text-red-700',
    'Medio Día':  'bg-blue-100 text-blue-700',
    'Descanso':   'bg-gray-100 text-gray-500',
    'Sin registro': 'bg-gray-100 text-gray-400',
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
  const showEntries = report.reportType === 'general' || report.reportType === 'halfday'

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
              <Th>Programado</Th>
              <Th>Balance</Th>
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
                rowIndex={di}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Summary sections ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Period summary */}
        <SummaryBox title="Resumen del período" color="#1e3a5f">
          <SummaryRow label="Días laborables"   value={String(report.totalWorkdays)} />
          <SummaryRow label="Días asistidos"    value={String(report.workdaysAttended)} />
          <SummaryRow label="Faltas"            value={String(report.totalAbsences)} />
          <SummaryRow label="Retardos"          value={String(report.totalLates)} />
          <SummaryRow label="Salidas anticipadas" value={String(report.totalEarlyDepartures)} />
          <SummaryRow label="% Asistencia"      value={`${report.attendancePercent}%`} />
        </SummaryBox>

        {/* Time without absences */}
        <SummaryBox title="Tiempo (sin faltas)" color="#2e6b4f">
          <SummaryRow label="Trabajado"   value={fmtMins(report.totalWorkedMinutes)} />
          <SummaryRow label="Programado"  value={fmtMins(report.scheduledMinutesNoAbsences)} />
          <SummaryRow label="Extras"      value={fmtMins(report.extraMinutesNoAbsences)} />
          <SummaryRow label="Balance"     value={fmtMins(report.balanceMinutesNoAbsences)} highlight />
        </SummaryBox>

        {/* Time with absences */}
        <SummaryBox title="Tiempo (con faltas)" color="#7b3f00">
          <SummaryRow label="Trabajado"   value={fmtMins(report.totalWorkedMinutes)} />
          <SummaryRow label="Programado"  value={fmtMins(report.scheduledMinutesWithAbsences)} />
          <SummaryRow label="Extras"      value={fmtMins(report.extraMinutesWithAbsences)} />
          <SummaryRow label="Balance"     value={fmtMins(report.balanceMinutesWithAbsences)} highlight />
        </SummaryBox>
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
  rowIndex,
}: {
  day: ReportDay
  reportType: ReportType
  showEntries: boolean
  rowIndex: number
}) {
  const bg = rowIndex % 2 === 0 ? '#fff' : '#f7f9fb'

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
  const [copying,     setCopying]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [printing,    setPrinting]    = useState(false)
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

  const renderReportToCanvas = async (empReport: EmployeeDetailReport): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;top:0;left:-9999px;width:794px;background:white;z-index:-1;'
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(
        <ReportContent report={empReport} fontSize={13} contentRef={{ current: null! }} />
      )

      // Double rAF ensures React has painted before capture
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        try {
          const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#fff' })
          resolve(canvas)
        } catch (err) {
          reject(err)
        } finally {
          root.unmount()
          document.body.removeChild(container)
        }
      }))
    })
  }

  const addCanvasToPdf = (pdf: jsPDF, canvas: HTMLCanvasElement, isFirst: boolean) => {
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW  = pageW - 40
    const imgH  = imgW / (canvas.width / canvas.height)

    if (!isFirst) pdf.addPage()

    if (imgH <= pageH - 40) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 20, imgW, imgH)
    } else {
      // Split tall report across multiple pages
      const sliceH = Math.floor((pageH - 40) / imgH * canvas.height)
      let yPos = 0
      let firstSlice = true
      while (yPos < canvas.height) {
        const sliceCanvas      = document.createElement('canvas')
        sliceCanvas.width      = canvas.width
        sliceCanvas.height     = Math.min(sliceH, canvas.height - yPos)
        const ctx              = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, -yPos)
        if (!firstSlice) pdf.addPage()
        const sliceImgH = sliceCanvas.height / canvas.width * imgW
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 20, 20, imgW, sliceImgH)
        yPos      += sliceH
        firstSlice = false
      }
    }
  }

  const handleSavePdf = async () => {
    setSaving(true)
    try {
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const reportsCache: Record<string, EmployeeDetailReport> = {}
      if (report) reportsCache[currentCode] = report

      for (let i = 0; i < employeeCodes.length; i++) {
        const code = employeeCodes[i]

        // Use cached report or fetch
        if (!reportsCache[code]) {
          reportsCache[code] = await reportsService.getEmployeeDetail(code, from, to, reportType)
        }

        const canvas = await renderReportToCanvas(reportsCache[code])
        addCanvasToPdf(pdf, canvas, i === 0)
      }

      const fileName = employeeCodes.length === 1
        ? `reporte-${employeeCodes[0]}-${from}.pdf`
        : `reportes-${from}-${to}.pdf`
      pdf.save(fileName)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const cache: Record<string, EmployeeDetailReport> = {}
      if (report) cache[currentCode] = report

      for (const code of employeeCodes) {
        if (!cache[code]) {
          cache[code] = await reportsService.getEmployeeDetail(code, from, to, reportType)
        }
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
          @media print {
            .page-break:last-child { page-break-after: avoid; }
          }
        </style>
      </head><body><div id="print-root"></div></body></html>`)
      printWindow.document.close()

      const rootEl = printWindow.document.getElementById('print-root')!
      const root   = createRoot(rootEl)

      root.render(
        <>
          {employeeCodes.map((code, i) => (
            <div
              key={code}
              className={i < employeeCodes.length - 1 ? 'page-break' : ''}
            >
              <ReportContent
                report={cache[code]}
                fontSize={13}
                contentRef={{ current: null! }}
              />
            </div>
          ))}
        </>
      )

      // Wait for React to paint then trigger print dialog
      requestAnimationFrame(() => requestAnimationFrame(() => {
        printWindow.focus()
        printWindow.print()
      }))
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
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 shrink-0 bg-gray-50 rounded-t-xl">
            {/* Navigation */}
            {total > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={prev}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 min-w-[70px] text-center">
                  {currentIndex + 1} de {total}
                </span>
                <button
                  onClick={next}
                  disabled={currentIndex >= total - 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex-1 truncate text-sm font-medium text-gray-700">
              {report ? `${report.employeeName} — ${report.employeeCode}` : 'Cargando…'}
            </div>

            {/* Font size */}
            <button
              onClick={() => setFontSize(s => Math.max(10, s - 1))}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Texto más pequeño"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFontSize(s => Math.min(18, s + 1))}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Texto más grande"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={copying || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Copiar imagen"
            >
              {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Copiar
            </button>

            {/* Save PDF */}
            <button
              onClick={handleSavePdf}
              disabled={saving || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              title="Guardar PDF"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={printing || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Imprimir"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Imprimir
            </button>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
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
