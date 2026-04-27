import { useAuthStore } from '@/store/authStore'
import { Redirect } from 'expo-router'

export default function Index() {
  const token = useAuthStore((s) => s.token)
  return <Redirect href={token ? '/(app)' : '/(auth)'} />
}
