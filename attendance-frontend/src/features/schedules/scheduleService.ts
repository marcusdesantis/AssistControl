import { api } from '@/services/api'
import type { Schedule, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/schedule'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export const scheduleService = {
  getAll: async (): Promise<Schedule[]> => {
    const res = await api.get<ApiResponse<Schedule[]>>('/schedules')
    return res.data.data ?? []
  },

  getById: async (id: string): Promise<Schedule> => {
    const res = await api.get<ApiResponse<Schedule>>(`/schedules/${id}`)
    return res.data.data!
  },

  create: async (data: CreateScheduleRequest): Promise<Schedule> => {
    const res = await api.post<ApiResponse<Schedule>>('/schedules', data)
    return res.data.data!
  },

  update: async (id: string, data: UpdateScheduleRequest): Promise<Schedule> => {
    const res = await api.put<ApiResponse<Schedule>>(`/schedules/${id}`, data)
    return res.data.data!
  },

  delete: async (id: string, reassignToId?: string): Promise<void> => {
    const params = reassignToId ? `?reassignTo=${reassignToId}` : ''
    await api.delete(`/schedules/${id}${params}`)
  },
}
