import { api } from '@/services/api'
import { normalizePage } from '@/services/normalizePage'
import type { Plan, Subscription, Invoice } from '@/types/billing'
import type { PagedResult } from '@/types/pagination'

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

export type InitiatePaymentResult =
  | { scheduled: true; scheduledAt: string }
  | { free: true; subscription: import('@/types/billing').Subscription }
  | {
      clientTransactionId: string
      amountCents:         number
      fullPriceCents:      number
      creditCents:         number
      storeId:             string
      token:               string
      reference:           string
      responseUrl:         string
      cancellationUrl:     string
    }

export const billingService = {
  getPlans: async (): Promise<Plan[]> => {
    const res = await api.get<ApiResponse<Plan[]>>('/plans')
    return res.data.data ?? []
  },

  getSubscription: async (): Promise<Subscription | null> => {
    const res = await api.get<ApiResponse<Subscription | null>>('/subscription')
    return res.data.data ?? null
  },

  subscribeFree: async (planId: string, billingCycle: 'monthly' | 'annual'): Promise<Subscription> => {
    const res = await api.post<ApiResponse<Subscription>>('/subscription', { planId, billingCycle })
    return res.data.data!
  },

  getProration: async (planId: string, billingCycle: 'monthly' | 'annual') => {
    const res = await api.post<ApiResponse<any>>('/payment/proration', { planId, billingCycle })
    return res.data.data!
  },

  initiatePayment: async (planId: string, billingCycle: 'monthly' | 'annual'): Promise<InitiatePaymentResult> => {
    const res = await api.post<ApiResponse<InitiatePaymentResult>>('/payment/initiate', { planId, billingCycle })
    return res.data.data!
  },

  cancelSubscription: async (): Promise<Subscription> => {
    const res = await api.delete<ApiResponse<Subscription>>('/subscription')
    return res.data.data!
  },

  getInvoices: async (page = 1, pageSize = 10): Promise<PagedResult<Invoice>> => {
    const res = await api.get<ApiResponse<any>>('/invoices', { params: { page, pageSize } })
    return normalizePage<Invoice>(res.data.data!)
  },

  openReceipt: async (invoiceId: string): Promise<void> => {
    const res = await api.get<string>(`/invoices/${invoiceId}/receipt`, { responseType: 'text' })
    const blob = new Blob([res.data], { type: 'text/html; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
