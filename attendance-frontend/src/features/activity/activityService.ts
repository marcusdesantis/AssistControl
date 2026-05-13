import { api } from '@/services/api'

export interface AuditLog {
  id:        string
  userId?:   string
  userName?: string
  action:    string
  module:    string
  detail?:   string
  ip?:       string
  source:    string
  createdAt: string
}

export interface AuditLogsResult {
  items:    AuditLog[]
  total:    number
  page:     number
  pageSize: number
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login':            'Inicio de sesión',
  'auth.logout':           'Cierre de sesión',
  'auth.change_password':  'Cambio de contraseña',
  'employee.create':       'Empleado creado',
  'employee.update':       'Empleado editado',
  'employee.delete':       'Empleado eliminado',
  'attendance.update':     'Asistencia editada',
  'attendance.delete':     'Asistencia eliminada',
  'schedule.create':       'Horario creado',
  'schedule.update':       'Horario editado',
  'schedule.delete':       'Horario eliminado',
  'message.send':          'Mensaje enviado',
  'message.update':        'Mensaje editado',
  'message.delete':        'Mensaje eliminado',
  'mobile.checkin':        'Check-in (móvil)',
  'mobile.checkout':       'Check-out (móvil)',
}

const MODULE_LABELS: Record<string, string> = {
  auth:        'Autenticación',
  employees:   'Empleados',
  attendance:  'Asistencia',
  schedules:   'Horarios',
  messages:    'Mensajes',
  mobile:      'App móvil',
}

export function labelAction(action: string) { return ACTION_LABELS[action] ?? action }
export function labelModule(module: string) { return MODULE_LABELS[module] ?? module }

export const activityService = {
  async getLogs(params: { page?: number; pageSize?: number; module?: string; search?: string } = {}): Promise<AuditLogsResult> {
    const q = new URLSearchParams()
    if (params.page)     q.set('page',     String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    if (params.module)   q.set('module',   params.module)
    if (params.search)   q.set('search',   params.search)
    const res = await api.get(`/audit?${q}`)
    return res.data.data
  },
}
