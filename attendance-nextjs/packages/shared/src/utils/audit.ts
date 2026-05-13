import prisma from '../prisma'

export interface CreateLogOptions {
  tenantId:  string
  userId?:   string
  userEmail?: string
  userName?: string
  action:    string
  module:    string
  detail?:   Record<string, unknown>
  ip?:       string
  source?:   'web' | 'mobile'
}

export async function createLog(opts: CreateLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId:  opts.tenantId,
        userId:    opts.userId,
        userEmail: opts.userEmail,
        userName:  opts.userName,
        action:    opts.action,
        module:    opts.module,
        detail:    opts.detail ? JSON.stringify(opts.detail) : null,
        ip:        opts.ip,
        source:    opts.source ?? 'web',
      },
    })
  } catch {
    // Logs nunca deben romper el flujo principal
  }
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? undefined
}
