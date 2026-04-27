export type EmployeeStatus = 'Active' | 'Inactive' | 'OnLeave'

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  fullName: string
  departmentId?: string | null
  departmentName?: string | null
  positionId?: string | null
  positionName?: string | null
  email: string
  phone?: string
  hireDate: string
  status: EmployeeStatus
  statusLabel: string
  tenantId: string
  createdAt: string
  hasPin: boolean
  scheduleId?: string
  scheduleName?: string
  username: string
  passwordDisplay: string
  pinDisplay?: string | null
}

export interface CreateEmployeeRequest {
  employeeCode?: string | null
  firstName: string
  lastName: string
  departmentId?: string | null
  positionId?: string | null
  email: string
  hireDate: string
  scheduleId: string
  username?: string
  password?: string
  phone?: string
  pin?: string
}

export interface UpdateEmployeeRequest {
  firstName: string
  lastName: string
  departmentId?: string | null
  positionId?: string | null
  email: string
  hireDate: string
  status: EmployeeStatus
  scheduleId: string
  phone?: string
  pin?: string
  clearPin?: boolean
  username?: string
  newPassword?: string
}
