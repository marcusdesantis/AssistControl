import { verifyToken, verifySuperadminToken, JwtAdminPayload, JwtEmployeePayload, JwtSuperadminPayload } from '../utils/jwt'
import { apiUnauthorized, apiBadRequest, apiServerError } from '../utils/response'
import { getTenantCapabilities, type PlanCapabilities } from '../utils/plan'
import prisma from '../prisma'

// Next.js 15 passes route context (params) as the second argument to route handlers.
// Our wrappers accept any additional args and forward them so the inner handler
// can destructure { params } when it needs dynamic route segments.

type AdminHandler<TArgs extends unknown[] = []> = (
  req: Request,
  ctx: { tenantId: string; admin: JwtAdminPayload },
  ...args: TArgs
) => Promise<Response>

type EmployeeHandler<TArgs extends unknown[] = []> = (
  req: Request,
  ctx: { tenantId: string; employee: JwtEmployeePayload; employeeId: string },
  ...args: TArgs
) => Promise<Response>

type AnyHandler<TArgs extends unknown[] = []> = (
  req: Request,
  ctx: { tenantId: string; admin?: JwtAdminPayload; employee?: JwtEmployeePayload },
  ...args: TArgs
) => Promise<Response>

type PublicHandler<TArgs extends unknown[] = []> = (
  req: Request,
  ...args: TArgs
) => Promise<Response>

function extractToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7)
}

function handleError(e: any, label: string): Response {
  if (e?.code === 'NOT_FOUND')        return Response.json({ success: false, message: e.message }, { status: 404 })
  if (e?.code === 'PLAN_LIMIT')       return Response.json({ success: false, code: 'PLAN_LIMIT',    message: e.message }, { status: 403 })
  if (e?.code === 'TENANT_INACTIVE')  return Response.json({ success: false, code: 'TENANT_INACTIVE', message: e.message }, { status: 403 })
  if (e?.code === 'USER_INACTIVE')    return Response.json({ success: false, code: 'USER_INACTIVE',   message: e.message }, { status: 403 })
  if (e?.code)                         return apiBadRequest(e.message, e.code)
  if (e?.name === 'ZodError')        return apiBadRequest(e.errors?.[0]?.message ?? 'Datos inválidos', 'VALIDATION_ERROR')
  if (e?.name === 'JsonWebTokenError' || e?.name === 'TokenExpiredError') return apiUnauthorized()
  console.error(`[${label}]`, e)
  return apiServerError()
}

export function withAdmin<TArgs extends unknown[]>(handler: AdminHandler<TArgs>) {
  return async (req: Request, ...rest: TArgs): Promise<Response> => {
    try {
      const token = extractToken(req)
      if (!token) return apiUnauthorized()
      const payload = verifyToken(token)
      if (payload.type !== 'admin') return apiUnauthorized('Token de empleado no válido aquí')
      const [tenant, user] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: payload.tenantId }, select: { isActive: true } }),
        prisma.user.findUnique({ where: { id: payload.sub },        select: { isActive: true } }),
      ])
      if (!tenant?.isActive) return Response.json(
        { success: false, code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada. Contacta al administrador del sistema.' },
        { status: 403 }
      )
      if (!user?.isActive) return Response.json(
        { success: false, code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta al administrador.' },
        { status: 403 }
      )
      return await handler(req, { tenantId: payload.tenantId, admin: payload }, ...rest)
    } catch (e) { return handleError(e, 'withAdmin') }
  }
}

export function withEmployee<TArgs extends unknown[]>(handler: EmployeeHandler<TArgs>) {
  return async (req: Request, ...rest: TArgs): Promise<Response> => {
    try {
      const token = extractToken(req)
      if (!token) return apiUnauthorized()
      const payload = verifyToken(token)
      if (payload.type !== 'employee') return apiUnauthorized('Token de admin no válido aquí')
      const [tenant, employee] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: payload.tenantId }, select: { isActive: true } }),
        prisma.employee.findUnique({ where: { id: payload.sub },    select: { status: true } }),
      ])
      if (!tenant?.isActive) return Response.json(
        { success: false, code: 'TENANT_INACTIVE', message: 'Tu cuenta ha sido desactivada. Contacta al administrador del sistema.' },
        { status: 403 }
      )
      if (employee?.status === 'Inactive') return Response.json(
        { success: false, code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta con tu empresa para más información.' },
        { status: 403 }
      )
      return await handler(req, { tenantId: payload.tenantId, employee: payload, employeeId: payload.sub }, ...rest)
    } catch (e) { return handleError(e, 'withEmployee') }
  }
}

export function withAny<TArgs extends unknown[]>(handler: AnyHandler<TArgs>) {
  return async (req: Request, ...rest: TArgs): Promise<Response> => {
    try {
      const token = extractToken(req)
      if (!token) return apiUnauthorized()
      const payload = verifyToken(token)
      const ctx: { tenantId: string; admin?: JwtAdminPayload; employee?: JwtEmployeePayload } = {
        tenantId: payload.tenantId,
      }
      if (payload.type === 'admin')    ctx.admin    = payload
      if (payload.type === 'employee') ctx.employee = payload
      return await handler(req, ctx, ...rest)
    } catch (e) { return handleError(e, 'withAny') }
  }
}

/** Wraps a public handler (no auth) — still catches errors uniformly */
export function withPublic<TArgs extends unknown[]>(handler: PublicHandler<TArgs>) {
  return async (req: Request, ...rest: TArgs): Promise<Response> => {
    try {
      return await handler(req, ...rest)
    } catch (e) { return handleError(e, 'withPublic') }
  }
}

/** Wraps withAdmin adding a plan capability check. Returns 403 PLAN_LIMIT if the tenant lacks the capability. */
export function withPlanGate<TArgs extends unknown[]>(
  capability: keyof PlanCapabilities,
  handler: AdminHandler<TArgs>
) {
  return withAdmin(async (req, ctx, ...rest: TArgs) => {
    const caps = await getTenantCapabilities(ctx.tenantId)
    if (!caps[capability]?.enabled) {
      return Response.json(
        { success: false, code: 'PLAN_LIMIT', message: 'Tu plan actual no incluye esta funcionalidad.', requiredCapability: capability },
        { status: 403 }
      )
    }
    return handler(req, ctx, ...rest)
  })
}

type SuperadminHandler<TArgs extends unknown[] = []> = (
  req: Request,
  ctx: { superadminId: string; email: string; name: string; sa: JwtSuperadminPayload },
  ...args: TArgs
) => Promise<Response>

/** Wraps a superadmin handler — validates superadmin JWT (type: 'superadmin') */
export function withSuperadmin<TArgs extends unknown[]>(handler: SuperadminHandler<TArgs>) {
  return async (req: Request, ...rest: TArgs): Promise<Response> => {
    try {
      const token = extractToken(req)
      if (!token) return apiUnauthorized()
      const payload = verifySuperadminToken(token)
      if (payload.type !== 'superadmin') return apiUnauthorized()
      return await handler(req, { superadminId: payload.sub, email: payload.email, name: payload.name, sa: payload }, ...rest)
    } catch (e) { return handleError(e, 'withSuperadmin') }
  }
}
