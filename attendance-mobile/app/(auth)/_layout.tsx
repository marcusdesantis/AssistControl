import { useAuthStore } from '@/store/authStore'
import { Redirect, Stack } from 'expo-router'

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token)
  if (token) return <Redirect href="/(app)" />
  return <Stack screenOptions={{ headerShown: false }} />
}
