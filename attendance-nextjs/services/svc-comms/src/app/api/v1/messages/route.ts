import { withPlanGate, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/messages/messages.service'

export const GET = withPlanGate('messages', async (req: Request, { tenantId }) => {
  const p          = new URL(req.url).searchParams
  const page       = Number(p.get('page')       ?? 1)
  const pageSize   = Number(p.get('pageSize')   ?? 20)
  const employeeId = p.get('employeeId') ?? undefined
  return apiOk(await svc.getAll(tenantId, page, pageSize, employeeId))
})

const sendSchema = z.object({
  forAll:      z.boolean(),
  employeeIds: z.array(z.string()).default([]),
  subject:     z.string().min(1),
  body:        z.string().min(1),
  allowDelete: z.boolean().default(true),
})

export const POST = withPlanGate('messages', async (req: Request, { tenantId, admin }) => {
  const data = sendSchema.parse(await req.json())
  // senderName comes from JWT username — same as .NET GetUsername() from claims
  const senderName = admin.username ?? 'Administrador'
  const count = await svc.send(tenantId, { ...data, senderName })
  return apiOk(count, `Mensaje enviado a ${count} empleado(s).`)
})
