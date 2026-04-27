import { api } from '@/services/api'
import { normalizePage } from '@/services/normalizePage'
import type { Department, Position } from '@/types/organization'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export interface OrgItemRequest {
  name:        string
  description: string | null
}

export interface OrgPageParams {
  page?:     number
  pageSize?: number
  search?:   string
}

export type { PagedResult }

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const res = await api.get<ApiResponse<Department[]>>('/departments', { params: { pageSize: 1000 } })
    return (res.data.data as any)?.items ?? res.data.data ?? []
  },

  getPaged: async (params: OrgPageParams = {}): Promise<PagedResult<Department>> => {
    const res = await api.get<ApiResponse<any>>('/departments', { params })
    return normalizePage<Department>(res.data.data!)
  },

  create: async (data: OrgItemRequest): Promise<Department> => {
    const res = await api.post<ApiResponse<Department>>('/departments', data)
    return res.data.data!
  },

  update: async (id: string, data: OrgItemRequest): Promise<Department> => {
    const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, data)
    return res.data.data!
  },

  delete: async (id: string, reassignToId?: string): Promise<void> => {
    await api.delete(`/departments/${id}`, { params: reassignToId ? { reassignToId } : undefined })
  },
}

export const positionService = {
  getAll: async (): Promise<Position[]> => {
    const res = await api.get<ApiResponse<Position[]>>('/positions', { params: { pageSize: 1000 } })
    return (res.data.data as any)?.items ?? res.data.data ?? []
  },

  getPaged: async (params: OrgPageParams = {}): Promise<PagedResult<Position>> => {
    const res = await api.get<ApiResponse<any>>('/positions', { params })
    return normalizePage<Position>(res.data.data!)
  },

  create: async (data: OrgItemRequest): Promise<Position> => {
    const res = await api.post<ApiResponse<Position>>('/positions', data)
    return res.data.data!
  },

  update: async (id: string, data: OrgItemRequest): Promise<Position> => {
    const res = await api.put<ApiResponse<Position>>(`/positions/${id}`, data)
    return res.data.data!
  },

  delete: async (id: string, reassignToId?: string): Promise<void> => {
    await api.delete(`/positions/${id}`, { params: reassignToId ? { reassignToId } : undefined })
  },
}
