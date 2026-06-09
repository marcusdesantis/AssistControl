import { withPublic, apiOk, prisma, getClientIp, createNotificationWithPush } from '@attendance/shared'

const PAGE_LABELS: Record<string, string> = {
  'home':                      'Inicio',
  'control-asistencia':        'Control de Asistencia',
  'control-personal-limpieza':    'Personal de Limpieza',
  'control-asistencia-logistica': 'Logística y Multisitio',
  'huella-biometrica':         'Huella Biométrica',
  'control-rutas':             'Control de Rutas',
}

export const POST = withPublic(async (req: Request) => {
  const body   = (await req.json().catch(() => ({}))) as any
  const page   = String(body.page   ?? 'home').slice(0, 100)
  const option = body.option ? String(body.option).slice(0, 500) : null
  const device = body.device ? String(body.device).slice(0, 20)  : null

  await prisma.leadEvent.create({
    data: {
      page,
      option,
      device,
      ip:        getClientIp(req),
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    },
  })

  const pageLabel = PAGE_LABELS[page] ?? page
  const deviceLabel = device === 'mobile' ? '📱 Móvil' : '🖥️ Desktop'

  createNotificationWithPush({
    forAdmin: true,
    title:    '💬 Nueva consulta por WhatsApp',
    body:     `${option ?? 'Consulta personalizada'} — ${pageLabel} (${deviceLabel})`,
    type:     'info',
  }).catch(() => {})

  return apiOk(null, 'ok')
})
