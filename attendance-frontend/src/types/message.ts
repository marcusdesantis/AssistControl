export interface EmployeeMessage {
  id:          string
  employeeId:  string
  employeeName: string
  senderName:  string
  subject:     string
  body:        string
  createdAt:   string
  isRead:      boolean
  allowDelete: boolean
}

export interface EmployeeStats {
  periodFrom:      string
  periodTo:        string
  totalLates:      number
  pendingCheckouts: number
  absences:        number
}

export interface CheckerResponse {
  attendance:      import('./attendance').AttendanceRecord
  pendingMessages: EmployeeMessage[]
  stats:           EmployeeStats
}
