import { api } from '@/services/api'
import { normalizePage } from '@/services/normalizePage'
import type { EmployeeMessage } from '@/types/message'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

export const messageService = {
  getByEmployee: async (employeeId: string, page = 1, pageSize = 15): Promise<PagedResult<EmployeeMessage>> => {
    const res = await api.get<ApiResponse<any>>(
      `/messages/employee/${employeeId}`, { params: { page, pageSize } }
    )
    return normalizePage<EmployeeMessage>(res.data.data!)
  },

  create: async (payload: {
    employeeIds?: string[]
    forAll: boolean
    subject: string
    body: string
    allowDelete: boolean
  }): Promise<number> => {
    const res = await api.post<ApiResponse<number>>('/messages', payload)
    return res.data.data ?? 0
  },

  updateAllowDelete: async (id: string, allowDelete: boolean): Promise<void> => {
    await api.patch(`/messages/${id}`, { allowDelete })
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/messages/${id}`)
  },

  markReadChecker: async (messageId: string, checkerKey: string): Promise<void> => {
    await api.post(`/checker/messages/${messageId}/read?checkerKey=${encodeURIComponent(checkerKey)}`)
  },

  deleteChecker: async (messageId: string, checkerKey: string): Promise<void> => {
    await api.delete(`/checker/messages/${messageId}?checkerKey=${encodeURIComponent(checkerKey)}`)
  },
}
