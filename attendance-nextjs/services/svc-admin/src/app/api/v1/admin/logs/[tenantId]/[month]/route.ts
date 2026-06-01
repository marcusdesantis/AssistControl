import { withSuperadmin, apiOk } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

type Ctx = { params: Promise<{ tenantId: string; month: string }> }

// GET /api/v1/admin/logs/:tenantId/:month  → contenido del archivo de respaldo
export const GET = withSuperadmin(async (_req, _ctx, { params }: Ctx) => {
  const { tenantId, month } = await params
  if (month === '_meta') return Response.json({ success: false, message: 'Archivo reservado.' }, { status: 400 })
  const filePath = path.join(LOGS_BASE, 'tenants', tenantId, `${month}.json`)
  if (!fs.existsSync(filePath)) return Response.json({ success: false, message: 'Archivo no encontrado.' }, { status: 404 })
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim()
    const data = raw ? JSON.parse(raw) : []
    return apiOk(Array.isArray(data) ? data : [])
  } catch {
    return apiOk([])
  }
})
