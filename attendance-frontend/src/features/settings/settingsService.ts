import { api } from '@/services/api'
import axios from 'axios'

interface ApiResponse<T> {
  success:    boolean
  message?:   string
  data?:      T
  errorCode?: string
}

export interface TenantSettings {
  // Invitaciones
  employeeCodePrefix:        string
  invitationExpirationHours: number
  invitationEmails:          string | null
  // SMTP
  smtpEnabled:   boolean
  smtpHost:      string | null
  smtpPort:      number
  smtpUsername:  string | null
  smtpPassword:  string | null   // "••••••••" si ya tiene contraseña guardada
  smtpFromName:  string | null
  smtpEnableSsl: boolean
  // Checador
  checkerKey:                  string
  checkerRequires2FA:          boolean
  checkerOtpExpirationMinutes: number
}

export interface InvitationCatalogItem {
  id:   string
  name: string
}

export interface InvitationInfo {
  isValid:            boolean
  companyName:        string
  logoBase64:         string | null
  employeeCodePrefix: string
  departments:        InvitationCatalogItem[]
  positions:          InvitationCatalogItem[]
  hasSchedule:        boolean
}

export const settingsService = {
  get: async (): Promise<TenantSettings> => {
    const res = await api.get<ApiResponse<TenantSettings>>('/settings')
    return res.data.data!
  },

  update: async (settings: TenantSettings): Promise<TenantSettings> => {
    const res = await api.put<ApiResponse<TenantSettings>>('/settings', settings)
    return res.data.data!
  },

  regenerateCheckerKey: async (): Promise<TenantSettings> => {
    const res = await api.post<ApiResponse<TenantSettings>>('/settings/checker-key/regenerate')
    return res.data.data!
  },

  sendInvitation: async (
    appBaseUrl: string,
    recipients: { email: string; assignedCode?: string; scheduleId?: string; scheduleStartDate?: string }[],
  ): Promise<{ results: { email: string; assignedCode: string | null; url: string; emailSent: boolean }[]; emailSent: boolean }> => {
    const res = await api.post<ApiResponse<{
      results:   { email: string; assignedCode: string | null; url: string; emailSent: boolean }[]
      expiresAt: string
      emailSent: boolean
    }>>(
      '/settings/invitations/send',
      { recipients },
      { headers: { 'X-App-Base-Url': appBaseUrl } }
    )
    return res.data.data!
  },
}

// Llamadas públicas sin autenticación
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const publicService = {
  getInvitationInfo: async (token: string): Promise<InvitationInfo> => {
    const res = await axios.get<ApiResponse<InvitationInfo>>(
      `${BASE_URL}/api/v1/public/invitation/${token}`
    )
    return res.data.data!
  },

  register: async (token: string, data: {
    firstName:    string
    lastName:     string
    departmentId: string | null
    positionId:   string | null
    email:        string
    phone:        string
    username:     string
    password:     string
  }): Promise<{ employeeId: string; employeeCode: string; pin: string; username: string; password: string }> => {
    const res = await axios.post<ApiResponse<{ employeeId: string; employeeCode: string; pin: string; username: string; password: string }>>(
      `${BASE_URL}/api/v1/public/invitation/${token}/register`,
      data
    )
    return res.data.data!
  },

  sendMyCredentials: async (employeeId: string): Promise<void> => {
    const res = await axios.post<ApiResponse<null>>(
      `${BASE_URL}/api/v1/public/employees/${employeeId}/send-credentials`
    )
    if (!res.data.success)
      throw new Error(res.data.message ?? 'Error al enviar credenciales')
  },
}
