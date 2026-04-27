import { useAuthStore } from '@/store/authStore'
import { Slot } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  )
}
