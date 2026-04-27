import { api } from '@/services/api'
import { normalizePage } from '@/services/normalizePage'
import type { AttendanceRecord, AttendanceDayRow, AttendancePeriodRow } from '@/types/attendance'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export interface DayViewFilters {
  date?: string
  page?: number
  pageSize?: number
  search?: string
  department?: string
  status?: string
}

export interface PeriodViewFilters {
  from: string
  to: string
  page?: number
  pageSize?: number
  search?: string
  department?: string
}

export const attendanceService = {
  getByDate: async (date?: string): Promise<AttendanceRecord[]> => {
    const params = date ? { date } : {}
    const res = await api.get<ApiResponse<AttendanceRecord[]>>('/attendance', { params })
    return res.data.data ?? []
  },

  getByEmployee: async (employeeId: string, from?: string, to?: string): Promise<AttendanceRecord[]> => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to)   params.to   = to
    const res = await api.get<ApiResponse<{ items: AttendanceRecord[] } | AttendanceRecord[]>>(`/attendance/employee/${employeeId}`, { params })
    const data = res.data.data
    return Array.isArray(data) ? data : (data as any)?.items ?? []
  },

  checkIn: async (employeeId: string): Promise<AttendanceRecord> => {
    const res = await api.post<ApiResponse<AttendanceRecord>>('/attendance/check-in', { employeeId })
    return res.data.data!
  },

  checkOut: async (employeeId: string, notes?: string): Promise<AttendanceRecord> => {
    const res = await api.post<ApiResponse<AttendanceRecord>>('/attendance/check-out', { employeeId, notes })
    return res.data.data!
  },

  getByDateRange: async (from: string, to: string): Promise<AttendanceRecord[]> => {
    const res = await api.get<ApiResponse<AttendanceRecord[]>>('/attendance/range', { params: { from, to } })
    return res.data.data ?? []
  },

  update: async (id: string, checkInTime?: string, checkOutTime?: string, notes?: string): Promise<AttendanceRecord> => {
    const res = await api.put<ApiResponse<AttendanceRecord>>(`/attendance/${id}`, { checkInTime, checkOutTime, notes })
    return res.data.data!
  },

  getDayView: async (filters: DayViewFilters = {}): Promise<PagedResult<AttendanceDayRow>> => {
    const params: Record<string, any> = {
      page:     filters.page     ?? 1,
      pageSize: filters.pageSize ?? 10,
    }
    if (filters.date)       params.date       = filters.date
    if (filters.search)     params.search     = filters.search
    if (filters.department) params.department = filters.department
    if (filters.status)     params.status     = filters.status
    const res = await api.get<ApiResponse<any>>('/attendance/day-view', { params })
    return normalizePage<AttendanceDayRow>(res.data.data!)
  },

  getPeriodView: async (filters: PeriodViewFilters): Promise<PagedResult<AttendancePeriodRow>> => {
    const params: Record<string, any> = {
      from:     filters.from,
      to:       filters.to,
      page:     filters.page     ?? 1,
      pageSize: filters.pageSize ?? 10,
    }
    if (filters.search)     params.search     = filters.search
    if (filters.department) params.department = filters.department
    const res = await api.get<ApiResponse<any>>('/attendance/period-view', { params })
    return normalizePage<AttendancePeriodRow>(res.data.data!)
  },
}
