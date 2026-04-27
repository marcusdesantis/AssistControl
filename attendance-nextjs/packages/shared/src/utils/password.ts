import bcrypt from 'bcryptjs'

const ROUNDS = 10

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export function generatePin(length = 4): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

export function generatePassword(length = 10): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghijkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$%'
  const pool    = upper + lower + digits + special
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ]
  for (let i = required.length; i < length; i++)
    required.push(pool[Math.floor(Math.random() * pool.length)])
  return required.sort(() => Math.random() - 0.5).join('')
}
