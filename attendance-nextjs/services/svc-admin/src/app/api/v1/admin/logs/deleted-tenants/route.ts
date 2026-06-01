import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

// GET /api/v1/admin/logs/deleted-tenants
// Retorna empresas eliminadas que aún tienen logs navegables (DB o backups)
export const GET = withSuperadmin(async () => {
  const tenantsDir = path.join(LOGS_BASE, 'tenants')

  // IDs de tenants activos (para excluirlos del scan)
  const activeTenants = await prisma.tenant.findMany({ select: { id: true } })
  const activeIds = new Set(activeTenants.map(t => t.id))

  const result: { id: string | null; name: string }[] = []
  const foundNames = new Set<string>()

  // Escanear filesystem en busca de carpetas huérfanas con _meta.json
  if (fs.existsSync(tenantsDir)) {
    for (const dir of fs.readdirSync(tenantsDir)) {
      if (activeIds.has(dir)) continue
      const metaPath = path.join(tenantsDir, dir, '_meta.json')
      if (!fs.existsSync(metaPath)) continue
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        if (meta.name) {
          result.push({ id: dir, name: meta.name })
          foundNames.add(meta.name)
        }
      } catch { /* ignore */ }
    }
  }

  // Fallback DB: tenants con logs huérfanos pero sin carpeta de backups
  const orphaned = await prisma.auditLog.groupBy({
    by: ['tenantName'],
    where: { tenantId: null, tenantName: { not: null } },
  })
  for (const { tenantName } of orphaned) {
    if (tenantName && !foundNames.has(tenantName)) {
      result.push({ id: null, name: tenantName })
    }
  }

  return apiOk(result)
})
