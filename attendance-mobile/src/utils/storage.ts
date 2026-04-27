import { Platform } from 'react-native'

// expo-secure-store solo funciona en dispositivos nativos.
// En web usamos localStorage como fallback.

let SecureStore: typeof import('expo-secure-store') | null = null

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store')
}

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    return SecureStore!.getItemAsync(key)
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
      return
    }
    await SecureStore!.setItemAsync(key, value)
  },

  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
      return
    }
    await SecureStore!.deleteItemAsync(key)
  },
}
