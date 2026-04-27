import { api } from '@/services/api'
import { normalizePage } from '@/services/normalizePage'
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/employee'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export interface EmployeeFilters {
  page?:       number
  pageSize?:   number
  search?:     string
  department?: string
  status?:     string
}

export interface CreateEmployeeResult {
  employee:           Employee
  generatedPin:       string | null
  generatedPassword:  string | null
}

export const employeeService = {
  getPaged: async (filters: EmployeeFilters = {}): Promise<PagedResult<Employee>> => {
    const params = {
      page:       filters.page       ?? 1,
      pageSize:   filters.pageSize   ?? 20,
      ...(filters.search     && { search:     filters.search }),
      ...(filters.department && { department: filters.department }),
      ...(filters.status     && { status:     filters.status }),
    }
    const res = await api.get<ApiResponse<any>>('/employees', { params })
    return normalizePage<Employee>(res.data.data!)
  },

  // Mantener getAll para casos que necesiten la lista completa (ej: modal de mensajes)
  getAll: async (): Promise<Employee[]> => {
    const res = await api.get<ApiResponse<PagedResult<Employee>>>('/employees', {
      params: { page: 1, pageSize: 500 }
    })
    return res.data.data?.items ?? []
  },

  getById: async (id: string): Promise<Employee> => {
    const res = await api.get<ApiResponse<Employee>>(`/employees/${id}`)
    return res.data.data!
  },

  getNextCode: async (): Promise<{ nextCode: string; prefix: string }> => {
    const res = await api.get<ApiResponse<{ nextCode: string; prefix: string }>>('/employees/next-code')
    return res.data.data!
  },

  create: async (data: CreateEmployeeRequest): Promise<CreateEmployeeResult> => {
    const res = await api.post<ApiResponse<CreateEmployeeResult>>('/employees', data)
    return res.data.data!
  },

  update: async (id: string, data: UpdateEmployeeRequest): Promise<Employee> => {
    const res = await api.put<ApiResponse<Employee>>(`/employees/${id}`, data)
    return res.data.data!
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`)
  },

  toggleStatus: async (emp: Employee): Promise<Employee> => {
    const newStatus: import('@/types/employee').EmployeeStatus =
      emp.status === 'Active' ? 'Inactive' : 'Active'
    const res = await api.put<ApiResponse<Employee>>(`/employees/${emp.id}`, {
      firstName:    emp.firstName,
      lastName:     emp.lastName,
      departmentId: emp.departmentId ?? null,
      positionId:   emp.positionId   ?? null,
      email:        emp.email,
      hireDate:     emp.hireDate,
      status:       newStatus,
      scheduleId:   emp.scheduleId ?? '',
      phone:        emp.phone       ?? undefined,
      username:     emp.username    ?? undefined,
    })
    return res.data.data!
  },

  sendCredentials: async (id: string): Promise<void> => {
    const res = await api.post<ApiResponse<null>>(`/employees/${id}/send-credentials`)
    if (!res.data.success)
      throw new Error(res.data.message ?? 'Error al enviar credenciales')
  },

  notify: async (id: string, data: { title: string; body: string; type: string }): Promise<void> => {
    await api.post(`/employees/${id}/notify`, data)
  },
}
