import { withAdmin, prisma } from '@attendance/shared'

export const GET = withAdmin(async (_req, { tenantId }, { params }: { params: Promise<{ invoiceId: string }> }) => {
  const { invoiceId } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  })
  if (!invoice) return new Response('Not found', { status: 404 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, legalName: true, taxId: true, street: true, city: true, state: true, email: true, phone1: true, timeZone: true, country: true },
  })

  const COUNTRY_LOCALE: Record<string, string> = {
    EC: 'es-EC', MX: 'es-MX', CO: 'es-CO', PE: 'es-PE', AR: 'es-AR', CL: 'es-CL',
    VE: 'es-VE', BO: 'es-BO', UY: 'es-UY', PY: 'es-PY', GT: 'es-GT', DO: 'es-DO',
    US: 'en-US', GB: 'en-GB',
  }
  const locale   = COUNTRY_LOCALE[tenant?.country?.toUpperCase() ?? 'EC'] ?? 'es-EC'
  const timeZone = tenant?.timeZone ?? 'America/Guayaquil'

  const fmt = (d: Date | null) => d
    ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone })
    : '—'

  const cycleLabel = invoice.billingCycle === 'annual' ? 'Anual' : 'Mensual'
  const address    = [tenant?.street, tenant?.city, tenant?.state].filter(Boolean).join(', ') || '—'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante ${invoice.invoiceNumber ?? invoice.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1e3a8a; }
    .brand { font-size: 20px; font-weight: bold; color: #1e3a8a; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .comp-box { text-align: right; }
    .comp-num { font-size: 16px; font-weight: bold; color: #1e3a8a; }
    .comp-label { font-size: 11px; color: #6b7280; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-label { font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .info-value { font-size: 13px; color: #111; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead { background: #1e3a8a; color: #fff; }
    th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .totals { margin-left: auto; width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .total-row.grand { border-top: 2px solid #1e3a8a; margin-top: 8px; padding-top: 10px; font-weight: bold; font-size: 15px; color: #1e3a8a; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 24px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AssistControl</div>
      <div class="brand-sub">Sistema de Gestión de Asistencia</div>
    </div>
    <div class="comp-box">
      <div class="comp-label">COMPROBANTE DE PAGO</div>
      <div class="comp-num">${invoice.invoiceNumber ?? invoice.id}</div>
      <div class="comp-label">Fecha: ${fmt(invoice.paidAt ?? invoice.createdAt)}</div>
      <div style="margin-top:6px"><span class="badge">PAGADO</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del cliente</div>
    <div class="info-grid">
      <div>
        <div class="info-label">Razón social</div>
        <div class="info-value">${tenant?.legalName ?? tenant?.name ?? '—'}</div>
      </div>
      <div>
        <div class="info-label">RUC / Identificación fiscal</div>
        <div class="info-value">${tenant?.taxId ?? '—'}</div>
      </div>
      <div>
        <div class="info-label">Dirección</div>
        <div class="info-value">${address}</div>
      </div>
      <div>
        <div class="info-label">Correo electrónico</div>
        <div class="info-value">${tenant?.email ?? '—'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalle del servicio</div>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Ciclo</th>
          <th>Período</th>
          <th style="text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>AssistControl — ${invoice.planName ?? 'Plan'}</td>
          <td>${cycleLabel}</td>
          <td>${fmt(invoice.periodStart)} — ${fmt(invoice.periodEnd)}</td>
          <td style="text-align:right">$${invoice.amount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>$${invoice.amount.toFixed(2)}</span></div>
      <div class="total-row"><span>IVA (0%)</span><span>$0.00</span></div>
      <div class="total-row grand"><span>TOTAL</span><span>$${invoice.amount.toFixed(2)} ${invoice.currency.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="footer">
    Este documento es un comprobante de pago interno. No es una factura electrónica autorizada por el SRI.<br/>
    AssistControl · ${new Date().getFullYear()}
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})
