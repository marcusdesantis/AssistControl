const COUNTRY_LOCALE: Record<string, string> = {
  EC: 'es-EC', MX: 'es-MX', CO: 'es-CO', PE: 'es-PE',
  AR: 'es-AR', CL: 'es-CL', VE: 'es-VE', BO: 'es-BO',
  UY: 'es-UY', PY: 'es-PY', GT: 'es-GT', HN: 'es-HN',
  SV: 'es-SV', NI: 'es-NI', CR: 'es-CR', PA: 'es-PA',
  DO: 'es-DO', CU: 'es-CU', US: 'en-US', GB: 'en-GB',
}

export function countryToLocale(country: string): string {
  return COUNTRY_LOCALE[country?.toUpperCase()] ?? 'es-EC'
}

export function fmtDate(
  d: string | Date | null | undefined,
  timeZone: string,
  country: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(countryToLocale(country), {
    year: 'numeric', month: 'short', day: 'numeric',
    timeZone,
    ...opts,
  })
}

export function fmtDateTime(
  d: string | Date | null | undefined,
  timeZone: string,
  country: string,
): string {
  if (!d) return '—'
  return new Date(d).toLocaleString(countryToLocale(country), {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone,
  })
}

export function fmtTime(
  d: string | Date | null | undefined,
  timeZone: string,
  country: string,
): string {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString(countryToLocale(country), {
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone,
  })
}

export function fmtMoney(amount: number, currency: string, country: string): string {
  return new Intl.NumberFormat(countryToLocale(country), {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(amount)
}
