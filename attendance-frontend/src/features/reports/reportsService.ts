import { api } from '@/services/api'
import type { AttendanceReportRow, ReportFilters, EmployeeDetailReport, ReportType } from '@/types/report'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export const reportsService = {
  getReport: async (filters: ReportFilters): Promise<PagedResult<AttendanceReportRow>> => {
    const params: Record<string, any> = {
      from:     filters.from,
      to:       filters.to,
      page:     filters.page     ?? 1,
      pageSize: filters.pageSize ?? 20,
    }
    if (filters.department) params.department = filters.department
    if (filters.search)     params.search     = filters.search

    const res = await api.get<ApiResponse<PagedResult<AttendanceReportRow>>>(
      `/reports/${filters.reportType}`,
      { params }
    )
    return res.data.data!
  },

  getEmployeeDetail: async (
    employeeCode: string,
    from:         string,
    to:           string,
    reportType:   ReportType = 'general',
  ): Promise<EmployeeDetailReport> => {
    const res = await api.get<ApiResponse<EmployeeDetailReport>>(
      '/reports/employee-detail',
      { params: { employeeCode, from, to, reportType } }
    )
    return res.data.data!
  },
}
