import { withSuperadmin, apiOk } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

// GET /api/v1/admin/logs?tenantId=xxx  → lista archivos de respaldo de un tenant
// GET /api/v1/admin/logs               → lista todos los tenants con respaldos
export const GET = withSuperadmin(async (req) => {
  const tenantId = new URL(req.url).searchParams.get('tenantId')

  if (tenantId) {
    const tenantDir = path.join(LOGS_BASE, 'tenants', tenantId)
    if (!fs.existsSync(tenantDir)) return apiOk([])
    const files = fs.readdirSync(tenantDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => ({
        month:    f.replace('.json', ''),
        filename: f,
        sizeKb:   Math.round(fs.statSync(path.join(tenantDir, f)).size / 1024),
      }))
    return apiOk(files)
  }

  // Sin tenantId → listar todos los tenants que tienen respaldos
  const tenantsDir = path.join(LOGS_BASE, 'tenants')
  if (!fs.existsSync(tenantsDir)) return apiOk([])
  const tenants = fs.readdirSync(tenantsDir).map(id => {
    const dir   = path.join(tenantsDir, id)
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    return { tenantId: id, backups: files.length, latest: files.sort().reverse()[0]?.replace('.json', '') ?? null }
  })
  return apiOk(tenants)
})
