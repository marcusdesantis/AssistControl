import { api, ApiResponse } from './api'

export interface LoginResult {
  token:        string
  employeeId:   string
  employeeCode: string
  fullName:     string
  email:        string
  hasSchedule:  boolean
  companyName:  string
  logoBase64:   string | null
  logoUrl:      string | null
}

export interface AttendanceRecord {
  id:             string
  employeeId:     string
  employeeCode:   string
  employeeName:   string
  department:     string
  date:           string
  checkInTime:    string | null
  checkOutTime:   string | null
  notes:          string | null
  status:         string
  statusLabel:    string
  hoursWorked:    number | null
  lateMinutes:    number
  latitude:       number | null
  longitude:      number | null
  registeredFrom: string
}

export interface EmployeeStatus {
  isCheckedIn:  boolean
  isCheckedOut: boolean
  today:        AttendanceRecord | null
}

export interface EmployeeMessage {
  id:          string
  senderName:  string
  subject:     string
  body:        string
  isRead:      boolean
  allowDelete: boolean
  createdAt:   string
}

export interface MobileNotification {
  id:         string
  title:      string
  body:       string
  type:       string
  isRead:     boolean
  createdAt:  string
}

export interface CheckInResult {
  attendance:      AttendanceRecord
  pendingMessages: EmployeeMessage[]
}

export const mobileService = {
  login: async (username: string, password: string): Promise<LoginResult> => {
    const res = await api.post<ApiResponse<LoginResult>>('/mobile/login', { username, password })
    if (!res.data.success || !res.data.data)
      throw new Error(res.data.message ?? 'Error al iniciar sesión')
    return res.data.data
  },

  getStatus: async (): Promise<EmployeeStatus> => {
    const res = await api.get<ApiResponse<EmployeeStatus>>('/mobile/status')
    return res.data.data!
  },

  requestOtp: async (pin: string): Promise<{ required: boolean; maskedEmail: string | null }> => {
    const res = await api.post<ApiResponse<{ required: boolean; maskedEmail: string | null }>>('/mobile/request-otp', { pin })
    if (!res.data.success || !res.data.data)
      throw new Error(res.data.message ?? 'Error al validar clave')
    return res.data.data
  },

  checkIn: async (latitude?: number, longitude?: number, pin?: string, otpCode?: string): Promise<CheckInResult> => {
    const res = await api.post<ApiResponse<CheckInResult>>('/mobile/check-in', {
      latitude:  latitude  ?? null,
      longitude: longitude ?? null,
      pin:       pin       ?? '',
      otpCode:   otpCode   ?? null,
    })
    if (!res.data.success || !res.data.data)
      throw new Error(res.data.message ?? 'Error al registrar entrada')
    return res.data.data
  },

  checkOut: async (latitude?: number, longitude?: number): Promise<CheckInResult> => {
    const res = await api.post<ApiResponse<CheckInResult>>('/mobile/check-out', {
      latitude:  latitude  ?? null,
      longitude: longitude ?? null,
    })
    if (!res.data.success || !res.data.data)
      throw new Error(res.data.message ?? 'Error al registrar salida')
    return res.data.data
  },

  markMessageRead: async (id: string): Promise<void> => {
    await api.post(`/mobile/messages/${id}/read`)
  },

  deleteMessage: async (id: string): Promise<void> => {
    await api.delete(`/mobile/messages/${id}`)
  },

  getHistory: async (params?: {
    from?: string; to?: string; status?: string; page?: number; pageSize?: number
  }): Promise<{ items: AttendanceRecord[]; totalCount: number; hasMore: boolean }> => {
    const res = await api.get<ApiResponse<{ items: AttendanceRecord[]; totalCount: number; hasMore: boolean }>>(
      '/mobile/history', { params }
    )
    return res.data.data ?? { items: [], totalCount: 0, hasMore: false }
  },

  updatePushToken: async (pushToken: string | null): Promise<void> => {
    await api.put('/mobile/push-token', { pushToken })
  },

  getNotifications: async (page = 1, pageSize = 20): Promise<{
    items: MobileNotification[]
    total: number
    totalPages: number
    unread: number
  }> => {
    const res = await api.get<ApiResponse<any>>('/mobile/notifications', { params: { page, pageSize } })
    return res.data.data!
  },

  markNotificationRead: async (id?: string): Promise<void> => {
    const url = id ? `/mobile/notifications?id=${id}` : '/mobile/notifications'
    await api.patch(url)
  },
}
