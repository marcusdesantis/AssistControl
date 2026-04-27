import { useAuthStore } from '@/store/authStore'
import type { PlanCapabilities } from '@/types/auth'

export interface PlanHook {
  can:          (cap: keyof PlanCapabilities) => boolean
  limit:        (cap: keyof PlanCapabilities) => number | null
  capabilities: PlanCapabilities
}

export function usePlan(): PlanHook {
  const capabilities = useAuthStore(s => s.capabilities)
  return {
    capabilities,
    can:   (cap) => capabilities[cap]?.enabled === true,
    limit: (cap) => capabilities[cap]?.limit ?? null,
  }
}
