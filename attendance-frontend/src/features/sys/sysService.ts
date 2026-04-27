import { sysApi } from '@/services/sysApi'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const sysAuthService = {
  login: async (email: string, password: string) => {
    const res = await axios.post<ApiResponse<{ token: string; name: string; email: string }>>(
      `${BASE_URL}/api/v1/admin/auth/login`,
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    )
    return res.data.data!
  },
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface SysMetrics {
  totalTenants: number; activeTenants: number; inactiveTenants: number
  totalEmployees: number; mrr: number; arr: number
  recentTenants: { id: string; name: string; country: string; createdAt: string; isActive: boolean }[]
}

export const sysMetricsService = {
  get: async (): Promise<SysMetrics> => {
    const res = await sysApi.get<ApiResponse<SysMetrics>>('/metrics')
    return res.data.data!
  },
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export interface SysTenant {
  id: string; name: string; legalName?: string; country: string
  timeZone: string; isActive: boolean; isDeleted: boolean; createdAt: string
  selfRegistered: boolean; pendingApproval: boolean
  subscription?: { status: string; plan: { name: string }; currentPeriodEnd?: string }
  _count?: { employees: number }
}

export interface SysTenantDetail extends SysTenant {
  taxId?: string; logoUrl?: string
  subscription?: SysTenant['subscription'] & { billingCycle: string; plan: { id: string; name: string; priceMonthly: number } }
  invoices: { id: string; amount: number; currency: string; status: string; createdAt: string }[]
  _count: { employees: number; users: number }
}

export interface CreateTenantDto {
  companyName: string; timeZone: string; country: string
  username: string; email: string; password: string
  planId?: string
}

export const sysTenantsService = {
  notify: async (tenantId: string, data: { title: string; body: string; type?: string }) => {
    const res = await sysApi.post<ApiResponse<unknown>>(`/tenants/${tenantId}/notify`, data)
    return res.data
  },
  email: async (tenantId: string, data: { subject: string; body: string; target?: string }) => {
    const res = await sysApi.post<ApiResponse<unknown>>(`/tenants/${tenantId}/email`, data)
    return res.data
  },
  bulk: async (data: { tenantIds: string[]; action: 'notify' | 'email'; title?: string; subject?: string; body: string; type?: string; target?: string }) => {
    const res = await sysApi.post<ApiResponse<{ sent: number }>>('/tenants/bulk', data)
    return res.data
  },
  create: async (data: CreateTenantDto) => {
    const res = await sysApi.post<ApiResponse<SysTenant>>('/tenants', data)
    return res.data.data!
  },
  list: async (page = 1, pageSize = 20, search?: string) => {
    const res = await sysApi.get<ApiResponse<{ items: SysTenant[]; total: number; totalPages: number }>>('/tenants', {
      params: { page, pageSize, search },
    })
    return res.data.data!
  },
  get: async (id: string): Promise<SysTenantDetail> => {
    const res = await sysApi.get<ApiResponse<SysTenantDetail>>(`/tenants/${id}`)
    return res.data.data!
  },
  update: async (id: string, data: Partial<{ name: string; legalName: string; country: string; timeZone: string }>) => {
    const res = await sysApi.patch<ApiResponse<SysTenant>>(`/tenants/${id}`, data)
    return res.data.data!
  },
  toggle: async (id: string) => {
    const res = await sysApi.post<ApiResponse<SysTenant>>(`/tenants/${id}`)
    return res.data.data!
  },
  approve: async (id: string) => {
    const res = await sysApi.post<ApiResponse<{ ok: boolean }>>(`/tenants/${id}/approve`)
    return res.data.data!
  },
}

// ─── Plans ────────────────────────────────────────────────────────────────────

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

export interface SysPlan {
  id: string; name: string; description: string
  priceMonthly: number; priceAnnual?: number; maxEmployees?: number
  isFree: boolean; isDefault: boolean; isActive: boolean
  features: string[]
  capabilities: PlanCapabilities
  sortOrder: number
}

export const sysPlansService = {
  list: async (): Promise<SysPlan[]> => {
    const res = await sysApi.get<ApiResponse<SysPlan[]>>('/plans')
    return res.data.data!
  },
  create: async (data: Partial<SysPlan>) => {
    const res = await sysApi.post<ApiResponse<SysPlan>>('/plans', data)
    return res.data.data!
  },
  update: async (id: string, data: Partial<SysPlan>) => {
    const res = await sysApi.patch<ApiResponse<SysPlan>>(`/plans/${id}`, data)
    return res.data.data!
  },
  tenants: async (id: string): Promise<{ tenantId: string; tenant: { name: string } }[]> => {
    const res = await sysApi.get<ApiResponse<{ tenantId: string; tenant: { name: string } }[]>>(`/plans/${id}`)
    return res.data.data!
  },
  delete: async (id: string, reassignTo?: string) => {
    const params = reassignTo ? `?reassignTo=${reassignTo}` : ''
    await sysApi.delete(`/plans/${id}${params}`)
  },
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface SysSubscription {
  id: string; tenantId: string; planId: string; status: string
  billingCycle: string; currentPeriodStart?: string; currentPeriodEnd?: string; cancelAtPeriodEnd: boolean
  tenant: { id: string; name: string; country: string }
  plan: { name: string; priceMonthly: number }
}

// ─── System Settings ──────────────────────────────────────────────────────────

export interface SystemSettings {
  smtpEnabled:              boolean
  smtpHost:                 string | null
  smtpPort:                 number
  smtpUsername:             string | null
  smtpPassword:             string | null
  smtpFromName:             string | null
  smtpFromEmail:            string | null
  smtpEnableSsl:            boolean
  gracePeriodDays:          number
  expiryReminderEnabled:    boolean
  expiryReminderTarget:     'admin' | 'company' | 'both'
  expiryReminderDays:       string
  requireApproval:          boolean
  termsOfUse:               string | null
  privacyPolicy:            string | null
}

export const sysSettingsService = {
  get: async (): Promise<SystemSettings> => {
    const res = await sysApi.get<ApiResponse<SystemSettings>>('/settings')
    return res.data.data!
  },
  update: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await sysApi.patch<ApiResponse<SystemSettings>>('/settings', data)
    return res.data.data!
  },
}

export const sysSubscriptionsService = {
  list: async (page = 1, pageSize = 20, search?: string) => {
    const res = await sysApi.get<ApiResponse<{ items: SysSubscription[]; total: number; totalPages: number }>>('/subscriptions', {
      params: { page, pageSize, ...(search ? { search } : {}) },
    })
    return res.data.data!
  },
  changePlan: async (tenantId: string, planId: string, billingCycle: 'monthly' | 'annual') => {
    const res = await sysApi.patch<ApiResponse<SysSubscription>>(`/subscriptions/${tenantId}`, { planId, billingCycle })
    return res.data.data!
  },
  updateDates: async (tenantId: string, currentPeriodStart: string | null, currentPeriodEnd: string | null) => {
    const res = await sysApi.patch<ApiResponse<SysSubscription>>(`/subscriptions/${tenantId}/dates`, { currentPeriodStart, currentPeriodEnd })
    return res.data.data!
  },
  getHistory: async (tenantId: string, page = 1, pageSize = 20, search?: string) => {
    const res = await sysApi.get<ApiResponse<{ items: SubscriptionLogEntry[]; total: number; page: number; pageSize: number }>>(
      `/subscriptions/${tenantId}/history`, { params: { page, pageSize, ...(search ? { search } : {}) } }
    )
    return res.data.data!
  },
}

export interface SubscriptionLogEntry {
  id:               string
  tenantId:         string
  action:           string
  planId:           string
  previousPlanId:   string | null
  billingCycle:     string
  amountPaid:       number | null
  creditAmount:     number | null
  createdAt:        string
  plan:             { name: string }
  previousPlanName: string | null
}

// ─── Users (sys) ─────────────────────────────────────────────────────────────

export interface SysUser {
  id: string; username: string; email: string; role: string
  isActive: boolean; mustChangePassword: boolean
  createdAt: string; lastLoginAt: string | null
  tenant: { id: string; name: string }
}

export const sysUsersService = {
  list: async (page = 1, pageSize = 20, search?: string, tenantId?: string, role?: string) => {
    const res = await sysApi.get<ApiResponse<{ items: SysUser[]; total: number; totalPages: number }>>('/users', {
      params: { page, pageSize, ...(search ? { search } : {}), ...(tenantId ? { tenantId } : {}), ...(role ? { role } : {}) },
    })
    return res.data.data!
  },
  create: async (data: { tenantId: string; username: string; email: string; password: string; role: string }) => {
    const res = await sysApi.post<ApiResponse<SysUser>>('/users', data)
    return res.data.data!
  },
  update: async (id: string, data: { username?: string; email?: string; role?: string; isActive?: boolean; newPassword?: string }) => {
    await sysApi.patch(`/users/${id}`, data)
  },
  toggle: async (id: string, isActive: boolean) => {
    await sysApi.patch(`/users/${id}`, { isActive: !isActive })
  },
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface SysInvoice {
  id:            string
  tenantId:      string
  invoiceNumber: string | null
  planName:      string | null
  amount:        number
  currency:      string
  status:        string
  billingCycle:  string
  paidAt:        string | null
  createdAt:     string
  tenant:        { id: string; name: string; taxId: string | null }
}

export const sysInvoicesService = {
  list: async (page = 1, pageSize = 20, search?: string) => {
    const res = await sysApi.get<ApiResponse<{ items: SysInvoice[]; total: number; totalPages: number; page: number; pageSize: number }>>(
      '/invoices', { params: { page, pageSize, ...(search ? { search } : {}) } }
    )
    return res.data.data!
  },

  openReceipt: async (invoiceId: string): Promise<void> => {
    const res = await sysApi.get<string>('/invoices/receipt', { params: { invoiceId }, responseType: 'text' })
    const blob = new Blob([res.data], { type: 'text/html; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
