export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'HalfDay'

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  department: string
  date: string            // "YYYY-MM-DD"
  checkInTime?: string    // ISO datetime
  checkOutTime?: string
  notes?: string
  status: AttendanceStatus
  statusLabel: string
  hoursWorked?: number
  lateMinutes: number
}

export interface AttendanceDaySubRecord {
  id: string
  checkInTime?: string
  checkOutTime?: string
  hoursWorked?: number
  registeredFrom: string   // "Web" | "Mobile" | "Checker" | ""
  latitude?: number
  longitude?: number
}

export interface AttendanceDayRow {
  employeeId: string
  employeeCode: string
  fullName: string
  department: string
  attendanceId?: string
  statusKey: string        // "None" | "Present" | "Late" | "Absent" | "HalfDay"
  statusLabel: string
  checkInTime?: string
  checkOutTime?: string
  hoursWorked?: number
  notes?: string
  registeredFrom: string   // "Web" | "Mobile" | "Checker" | ""
  latitude?: number
  longitude?: number
  records: AttendanceDaySubRecord[]
}

export interface AttendancePeriodRow {
  employeeId: string
  employeeCode: string
  fullName: string
  department: string
  present: number
  late: number
  absent: number
  totalHours: number
}
