import { z } from 'zod'

export const registerSchema = z.object({
  companyName: z.string().min(2),
  timeZone:    z.string().default('America/Guayaquil'),
  country:     z.string().length(2).toUpperCase().default('EC'),
  username:    z.string().min(3),
  email:       z.string().email(),
  password:    z.string().min(6),
})

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  token: z.string().min(1),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6),
  confirmPassword: z.string().min(1),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

export const verifyPasswordSchema = z.object({
  password: z.string().min(1),
})

export const updateMeSchema = z.object({
  email: z.string().email().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token:           z.string().min(1),
  newPassword:     z.string().min(6),
  confirmPassword: z.string().min(1),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

export type UpdateMeDto       = z.infer<typeof updateMeSchema>
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordDto  = z.infer<typeof resetPasswordSchema>

export type RegisterDto       = z.infer<typeof registerSchema>
export type LoginDto          = z.infer<typeof loginSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
