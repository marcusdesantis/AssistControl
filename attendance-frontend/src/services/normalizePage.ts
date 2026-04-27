import type { PagedResult } from '@/types/pagination'

export function normalizePage<T>(raw: any): PagedResult<T> {
  const totalCount = raw.totalCount ?? raw.total ?? 0
  const totalPages = raw.totalPages ?? (Math.ceil(totalCount / (raw.pageSize || 1)) || 1)
  return {
    ...raw,
    totalCount,
    totalPages,
    hasPrevious: (raw.page ?? 1) > 1,
    hasNext:     (raw.page ?? 1) < totalPages,
  }
}
