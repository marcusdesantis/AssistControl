import prisma from '../prisma'

export interface ModuleCap {
  enabled: boolean
  limit?:  number | null
}

export interface PlanCapabilities {
  employees:      ModuleCap
  attendance:     ModuleCap
  checker:        ModuleCap
  mobileApp:      ModuleCap
  schedules:      ModuleCap
  organization:   ModuleCap
  messages:       ModuleCap
  reports:        ModuleCap
  settings:       ModuleCap
  prioritySupport: ModuleCap
}

export const DEFAULT_CAPABILITIES: PlanCapabilities = {
  employees:       { enabled: true  },
  attendance:      { enabled: true  },
  checker:         { enabled: true  },
  mobileApp:       { enabled: false },
  schedules:       { enabled: false },
  organization:    { enabled: false },
  messages:        { enabled: false },
  reports:         { enabled: false },
  settings:        { enabled: true  },
  prioritySupport: { enabled: false },
}

export async function checkPlanLimit(
  tenantId: string,
  capability: keyof PlanCapabilities,
  currentCount: number,
  itemLabel = 'registros',
): Promise<void> {
  const caps = await getTenantCapabilities(tenantId)
  const cap  = caps[capability]
  if (cap.limit != null && currentCount >= cap.limit) {
    throw { code: 'PLAN_LIMIT', message: `Has alcanzado el límite de ${itemLabel} de tu plan (máx. ${cap.limit}).` }
  }
}

export async function getTenantCapabilities(tenantId: string): Promise<PlanCapabilities> {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: { select: { capabilities: true } } },
  })
  if (!sub) return DEFAULT_CAPABILITIES
  const stored = sub.plan.capabilities as Partial<PlanCapabilities>
  return {
    employees:       { ...DEFAULT_CAPABILITIES.employees,       ...(stored.employees       ?? {}) },
    attendance:      { ...DEFAULT_CAPABILITIES.attendance,      ...(stored.attendance      ?? {}) },
    checker:         { ...DEFAULT_CAPABILITIES.checker,         ...(stored.checker         ?? {}) },
    mobileApp:       { ...DEFAULT_CAPABILITIES.mobileApp,       ...(stored.mobileApp       ?? {}) },
    schedules:       { ...DEFAULT_CAPABILITIES.schedules,       ...(stored.schedules       ?? {}) },
    organization:    { ...DEFAULT_CAPABILITIES.organization,    ...(stored.organization    ?? {}) },
    messages:        { ...DEFAULT_CAPABILITIES.messages,        ...(stored.messages        ?? {}) },
    reports:         { ...DEFAULT_CAPABILITIES.reports,         ...(stored.reports         ?? {}) },
    settings:        { ...DEFAULT_CAPABILITIES.settings,        ...(stored.settings        ?? {}) },
    prioritySupport: { ...DEFAULT_CAPABILITIES.prioritySupport, ...(stored.prioritySupport ?? {}) },
  }
}
