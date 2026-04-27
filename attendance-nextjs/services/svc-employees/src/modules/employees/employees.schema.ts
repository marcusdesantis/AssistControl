import { z } from 'zod'

export const createEmployeeSchema = z.object({
  employeeCode: z.string().nullish(),
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  departmentId: z.string().uuid().nullish(),
  positionId:   z.string().uuid().nullish(),
  email:        z.string().email(),
  hireDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduleId:   z.string().uuid(),
  phone:        z.string().nullish(),
  pin:          z.string().nullish(),
  username:     z.string().nullish(),
  password:     z.string().nullish(),
})

export const updateEmployeeSchema = z.object({
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  departmentId: z.string().uuid().nullish(),
  positionId:   z.string().uuid().nullish(),
  email:        z.string().email(),
  hireDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:       z.enum(['Active', 'Inactive', 'OnLeave']),
  scheduleId:   z.string().uuid(),
  phone:        z.string().nullish(),
  pin:          z.string().nullish(),
  clearPin:     z.boolean().default(false),
  username:     z.string().nullish(),
  newPassword:  z.string().nullish(),
})

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>
