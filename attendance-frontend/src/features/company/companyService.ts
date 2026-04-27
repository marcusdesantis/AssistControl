import { api } from '@/services/api'

interface ApiResponse<T> {
  success:    boolean
  message?:   string
  data?:      T
  errorCode?: string
}

export interface CompanyProfile {
  name:            string
  legalName?:      string
  taxId?:          string
  businessLicense?: string
  logoBase64?:     string
  street?:         string
  betweenStreets?: string
  neighborhood?:   string
  city?:           string
  postalCode?:     string
  municipality?:   string
  state?:          string
  phone1?:         string
  phone2?:         string
  fax?:            string
  email?:          string
  website?:        string
}

export const companyService = {
  get: async (): Promise<CompanyProfile> => {
    const res = await api.get<ApiResponse<CompanyProfile>>('/company')
    return res.data.data!
  },

  update: async (profile: CompanyProfile): Promise<CompanyProfile> => {
    const res = await api.put<ApiResponse<CompanyProfile>>('/company', profile)
    return res.data.data!
  },
}
