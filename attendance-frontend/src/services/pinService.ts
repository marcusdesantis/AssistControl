import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/utils/platform'

const PIN_KEY   = 'pin_value'
const PIN_EN    = 'pin_enabled'
const PIN_CREDS = 'pin_credentials'

export async function isPinEnabled(): Promise<boolean> {
  if (!isNative) return false
  const { value } = await Preferences.get({ key: PIN_EN })
  return value === 'true'
}

export async function savePin(pin: string, username: string, password: string): Promise<void> {
  await Preferences.set({ key: PIN_KEY,   value: pin })
  await Preferences.set({ key: PIN_EN,    value: 'true' })
  await Preferences.set({ key: PIN_CREDS, value: JSON.stringify({ username, password }) })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const { value } = await Preferences.get({ key: PIN_KEY })
  return value === pin
}

export async function getPinCredentials(): Promise<{ username: string; password: string } | null> {
  try {
    const { value } = await Preferences.get({ key: PIN_CREDS })
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function disablePin(): Promise<void> {
  await Preferences.remove({ key: PIN_KEY })
  await Preferences.remove({ key: PIN_EN })
  await Preferences.remove({ key: PIN_CREDS })
}

export async function getPinStoredUsername(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: PIN_CREDS })
    if (!value) return null
    return JSON.parse(value).username ?? null
  } catch {
    return null
  }
}
