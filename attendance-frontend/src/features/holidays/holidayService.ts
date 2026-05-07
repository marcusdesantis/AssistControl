import { api } from '@/services/api'

export interface Holiday {
  id:          string
  date:        string
  name:        string
  localName:   string | null
  description: string | null
  createdAt:   string
}

export interface GenerateResult {
  added:    number
  replaced: number
  total:    number
}

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

export const holidayService = {
  getAll: async (year: number): Promise<Holiday[]> => {
    const res = await api.get<ApiResponse<Holiday[]>>('/holidays', { params: { year } })
    return res.data.data ?? []
  },

  create: async (data: { date: string; name: string; description?: string | null }): Promise<Holiday> => {
    const res = await api.post<ApiResponse<Holiday>>('/holidays', data)
    return res.data.data!
  },

  update: async (id: string, data: { date: string; name: string; description?: string | null }): Promise<Holiday> => {
    const res = await api.put<ApiResponse<Holiday>>(`/holidays/${id}`, data)
    return res.data.data!
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/holidays/${id}`)
  },

  generate: async (year: number): Promise<GenerateResult> => {
    const res = await api.post<ApiResponse<GenerateResult>>('/holidays', { action: 'generate', year })
    return res.data.data!
  },
}
