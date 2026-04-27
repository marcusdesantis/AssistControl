import { storage } from '@/utils/storage'
import { create } from 'zustand'

interface AuthState {
  token:        string | null
  employeeId:   string | null
  employeeCode: string | null
  fullName:     string | null
  email:        string | null
  hasSchedule:  boolean
  checkerKey:   string | null
  companyName:  string | null
  logoBase64:   string | null
  logoUrl:      string | null

  setAuth: (params: {
    token:        string
    employeeId:   string
    employeeCode: string
    fullName:     string
    email:        string
    hasSchedule:  boolean
    companyName:  string
    logoBase64:   string | null
    logoUrl:      string | null
  }) => Promise<void>

  clearAuth: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token:        null,
  employeeId:   null,
  employeeCode: null,
  fullName:     null,
  email:        null,
  hasSchedule:  false,
  checkerKey:   null,
  companyName:  null,
  logoBase64:   null,
  logoUrl:      null,

  setAuth: async ({ token, employeeId, employeeCode, fullName, email, hasSchedule, companyName, logoBase64, logoUrl }) => {
    await storage.setItem('employee_token',   token)
    await storage.setItem('employee_id',      employeeId)
    await storage.setItem('employee_code',    employeeCode)
    await storage.setItem('employee_name',    fullName)
    await storage.setItem('employee_email',   email)
    await storage.setItem('has_schedule',     hasSchedule ? '1' : '0')
    await storage.setItem('company_name',     companyName)
    if (logoBase64) await storage.setItem('company_logo_b64', logoBase64)
    if (logoUrl)    await storage.setItem('company_logo_url', logoUrl)
    set({ token, employeeId, employeeCode, fullName, email, hasSchedule, companyName, logoBase64, logoUrl })
  },

  clearAuth: async () => {
    await storage.deleteItem('employee_token')
    await storage.deleteItem('employee_id')
    await storage.deleteItem('employee_code')
    await storage.deleteItem('employee_name')
    await storage.deleteItem('employee_email')
    await storage.deleteItem('has_schedule')
    await storage.deleteItem('company_name')
    await storage.deleteItem('company_logo_b64')
    await storage.deleteItem('company_logo_url')
    set({ token: null, employeeId: null, employeeCode: null, fullName: null, email: null, hasSchedule: false, checkerKey: null, companyName: null, logoBase64: null, logoUrl: null })
  },

  loadFromStorage: async () => {
    const token        = await storage.getItem('employee_token')
    const employeeId   = await storage.getItem('employee_id')
    const employeeCode = await storage.getItem('employee_code')
    const fullName     = await storage.getItem('employee_name')
    const email        = await storage.getItem('employee_email')
    const hasSchedule  = (await storage.getItem('has_schedule')) === '1'
    const companyName  = await storage.getItem('company_name')
    const logoBase64   = await storage.getItem('company_logo_b64')
    const logoUrl      = await storage.getItem('company_logo_url')
    if (token) {
      set({ token, employeeId, employeeCode, fullName, email, hasSchedule, companyName, logoBase64, logoUrl })
    }
  },
}))
