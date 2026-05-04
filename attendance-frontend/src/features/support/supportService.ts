import { api } from '@/services/api'

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

export interface SupportInfo {
  whatsapp: string | null
  phone:    string | null
  email:    string | null
}

export interface Ticket {
  id: string; subject: string; category: string
  status: string; priority: string
  createdAt: string; updatedAt: string; resolvedAt: string | null
  _count: { messages: number }
}

export interface TicketDetail extends Ticket {
  description: string
  messages: { id: string; body: string; authorType: string; createdAt: string }[]
}

export const supportService = {
  info: async (): Promise<SupportInfo> => {
    const res = await api.get<ApiResponse<SupportInfo>>('/support/info')
    return res.data.data!
  },
  list: async (): Promise<Ticket[]> => {
    const res = await api.get<ApiResponse<Ticket[]>>('/support/tickets')
    return res.data.data!
  },
  create: async (data: { subject: string; description: string; category: string }): Promise<Ticket> => {
    const res = await api.post<ApiResponse<Ticket>>('/support/tickets', data)
    return res.data.data!
  },
  get: async (id: string): Promise<TicketDetail> => {
    const res = await api.get<ApiResponse<TicketDetail>>(`/support/tickets/${id}`)
    return res.data.data!
  },
  reply: async (id: string, body: string): Promise<unknown> => {
    const res = await api.post<ApiResponse<unknown>>(`/support/tickets/${id}/messages`, { body })
    return res.data.data!
  },
}
