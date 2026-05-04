import jwt from 'jsonwebtoken'

const SECRET           = process.env.JWT_SECRET            ?? 'change-me'
const SUPERADMIN_SECRET = process.env.SUPERADMIN_JWT_SECRET ?? SECRET
const EXPIRES          = process.env.JWT_EXPIRES_IN        ?? '1440m'
const EXPIRES_MOBILE = process.env.JWT_EXPIRES_MOBILE ?? '7d'

export interface JwtAdminPayload {
  sub:      string   // userId
  tenantId: string
  role:     string
  username: string
  type:     'admin'
}

export interface JwtEmployeePayload {
  sub:          string   // employeeId
  tenantId:     string
  employeeCode: string
  type:         'employee'
}

export interface JwtSuperadminPayload {
  sub:   string   // superadminId
  email: string
  name:  string
  type:  'superadmin'
}

export function signAdmin(payload: Omit<JwtAdminPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions)
}

export function signEmployee(payload: Omit<JwtEmployeePayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'employee' }, SECRET, { expiresIn: EXPIRES_MOBILE } as jwt.SignOptions)
}

export function signSuperadmin(payload: Omit<JwtSuperadminPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'superadmin' }, SUPERADMIN_SECRET, { expiresIn: EXPIRES } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtAdminPayload | JwtEmployeePayload {
  return jwt.verify(token, SECRET) as JwtAdminPayload | JwtEmployeePayload
}

export function verifySuperadminToken(token: string): JwtSuperadminPayload {
  return jwt.verify(token, SUPERADMIN_SECRET) as JwtSuperadminPayload
}
