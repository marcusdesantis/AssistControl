export interface ModuleCap {
  enabled: boolean
  limit?:  number | null
}

export interface PlanCapabilities {
  employees:    ModuleCap
  attendance:   ModuleCap
  checker:      ModuleCap
  mobileApp:    ModuleCap
  schedules:    ModuleCap
  organization: ModuleCap
  messages:     ModuleCap
  reports:      ModuleCap
  settings:     ModuleCap
}

export const DEFAULT_CAPABILITIES: PlanCapabilities = {
  employees:    { enabled: true  },
  attendance:   { enabled: true  },
  checker:      { enabled: true  },
  mobileApp:    { enabled: false },
  schedules:    { enabled: false },
  organization: { enabled: false },
  messages:     { enabled: false },
  reports:      { enabled: false },
  settings:     { enabled: true  },
}

export interface UserInfo {
  id: string
  username: string
  email: string
  role: 'Admin' | 'Supervisor' | 'Employee'
  tenantId: string
  mustChangePassword: boolean
  timeZone: string
  country: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken:  string
  refreshToken: string
  expiresAt:    string
  user:         UserInfo
  capabilities: PlanCapabilities
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string | null
  data: T | null
  errorCode: string | null
  errors: string[]
}
