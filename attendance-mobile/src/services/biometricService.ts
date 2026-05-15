import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const CREDENTIALS_KEY = 'biometric_credentials'
const ENABLED_KEY     = 'biometric_enabled'

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none'

/** Verifica si el dispositivo tiene hardware biométrico Y tiene biométricos registrados en el OS */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) return false
  const isEnrolled = await LocalAuthentication.isEnrolledAsync()
  return isEnrolled
}

/** Solo verifica si hay hardware biométrico (sin importar si está enrolado o si hay permiso) */
export async function hasBiometricHardware(): Promise<boolean> {
  return LocalAuthentication.hasHardwareAsync()
}

/** Devuelve el tipo de biométrico disponible */
export async function getBiometricType(): Promise<BiometricType> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'facial'
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))        return 'fingerprint'
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS))               return 'iris'
  return 'none'
}

/** Verifica si el usuario activó el login biométrico en esta app */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(ENABLED_KEY)
    return val === 'true'
  } catch {
    return false
  }
}

/** Dispara el diálogo biométrico del OS y devuelve si pasó */
export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:         reason,
    fallbackLabel:         'Usar contraseña',
    cancelLabel:           'Cancelar',
    disableDeviceFallback: true,
  })
  return result.success
}

/** Guarda las credenciales protegidas por biométrico */
export async function saveCredentials(username: string, password: string): Promise<void> {
  const ok = await authenticate('Confirma tu identidad para activar el acceso biométrico')
  if (!ok) throw new Error('Autenticación biométrica cancelada')
  const data = JSON.stringify({ username, password })
  await SecureStore.setItemAsync(CREDENTIALS_KEY, data)
  await SecureStore.setItemAsync(ENABLED_KEY, 'true')
}

/**
 * Recupera las credenciales usando biométrico.
 * Retorna null si el usuario cancela o falla.
 */
export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  const ok = await authenticate('Usa tu huella digital para ingresar')
  if (!ok) return null
  try {
    const data = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!data) return null
    return JSON.parse(data) as { username: string; password: string }
  } catch {
    return null
  }
}

/** Desactiva el login biométrico y borra las credenciales guardadas */
export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY).catch(() => {})
  await SecureStore.setItemAsync(ENABLED_KEY, 'false')
}

/** Lee el usuario guardado en las credenciales biométricas sin requerir autenticación */
export async function getStoredCredentialUsername(): Promise<string | null> {
  try {
    const data = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!data) return null
    return JSON.parse(data).username ?? null
  } catch {
    return null
  }
}
