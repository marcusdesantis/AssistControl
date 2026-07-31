import { useAuthStore } from '@/store/authStore'
import { Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage().finally(() => {
      setReady(true)
      SplashScreen.hideAsync()
    })
  }, [])

  // SafeAreaProvider es obligatorio para que SafeAreaView y useSafeAreaInsets
  // devuelvan los insets reales del dispositivo. Sin él los valores llegan en
  // cero de forma intermitente y la barra de navegación del sistema termina
  // tapando el menú inferior.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {ready ? (
          <Slot />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
