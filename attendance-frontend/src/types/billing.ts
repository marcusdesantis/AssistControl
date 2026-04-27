export interface Plan {
  id:           string
  name:         string
  description:  string | null
  priceMonthly: number
  priceAnnual:  number | null
  maxEmployees: number | null
  features:     string[]
  capabilities: import('@/types/auth').PlanCapabilities
  isActive:     boolean
  isFree:       boolean
  isDefault:    boolean
  sortOrder:    number
}

export interface Subscription {
  id:                   string
  tenantId:             string
  planId:               string
  plan:                 Plan
  status:               'trialing' | 'active' | 'past_due' | 'canceled'
  billingCycle:         'monthly' | 'annual'
  stripeSubscriptionId: string | null
  trialEndsAt:          string | null
  currentPeriodStart:   string | null
  currentPeriodEnd:     string | null
  cancelAtPeriodEnd:     boolean
  canceledAt:            string | null
  scheduledPlanId:       string | null
  scheduledBillingCycle: string | null
  createdAt:             string
  daysUntilExpiry:      number | null
  inGracePeriod:        boolean
  graceLeft:            number | null
  wasAutoDowngraded?:   boolean
}

export interface Invoice {
  id:               string
  tenantId:         string
  stripeInvoiceId:  string | null
  invoiceNumber:    string | null
  planName:         string | null
  amount:           number
  currency:         string
  status:           'open' | 'paid' | 'void' | 'uncollectible'
  billingCycle:     'monthly' | 'annual'
  periodStart:      string | null
  periodEnd:        string | null
  paidAt:           string | null
  invoicePdfUrl:    string | null
  hostedInvoiceUrl: string | null
  createdAt:        string
}

export interface PaymentMethod {
  id:                    string
  stripePaymentMethodId: string
  brand:                 string | null
  last4:                 string | null
  expMonth:              number | null
  expYear:               number | null
  isDefault:             boolean
}
