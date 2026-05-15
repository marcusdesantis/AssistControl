import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/utils/platform'

const CREDS_KEY   = 'bio_credentials'
const ENABLED_KEY = 'bio_enabled'

export type BiometricType = 'fingerprint' | 'facial' | 'none'

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative) return false
  try {
    const info = await BiometricAuth.checkBiometry()
    return info.isAvailable
  } catch {
    return false
  }
}

export async function getBiometricType(): Promise<BiometricType> {
  if (!isNative) return 'none'
  try {
    const info = await BiometricAuth.checkBiometry()
    if (!info.isAvailable) return 'none'
    if (info.biometryType === BiometryType.faceId ||
        info.biometryType === BiometryType.faceAuthentication) return 'facial'
    return 'fingerprint'
  } catch {
    return 'none'
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  if (!isNative) return false
  try {
    const { value } = await Preferences.get({ key: ENABLED_KEY })
    return value === 'true'
  } catch {
    return false
  }
}

export async function authenticate(reason: string): Promise<boolean> {
  if (!isNative) return false
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle:                  'Cancelar',
      androidTitle:                 'TiempoYa Admin',
      androidSubtitle:              reason,
      androidConfirmationRequired:  false,
      allowDeviceCredential:        false,
    })
    return true
  } catch {
    return false
  }
}

export async function saveCredentials(username: string, password: string): Promise<void> {
  const ok = await authenticate('Confirma tu identidad para activar el acceso biométrico')
  if (!ok) throw new Error('Autenticación cancelada')
  await Preferences.set({ key: CREDS_KEY,   value: JSON.stringify({ username, password }) })
  await Preferences.set({ key: ENABLED_KEY, value: 'true' })
}

export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  if (!isNative) return null
  const ok = await authenticate('Usa tu biométrico para ingresar')
  if (!ok) return null
  try {
    const { value } = await Preferences.get({ key: CREDS_KEY })
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function getStoredUsername(): Promise<string | null> {
  if (!isNative) return null
  try {
    const { value } = await Preferences.get({ key: CREDS_KEY })
    if (!value) return null
    return JSON.parse(value).username ?? null
  } catch {
    return null
  }
}

export async function disableBiometric(): Promise<void> {
  if (!isNative) return
  await Preferences.remove({ key: CREDS_KEY })
  await Preferences.set({ key: ENABLED_KEY, value: 'false' })
}
