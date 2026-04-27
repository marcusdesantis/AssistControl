import { Navigate, Outlet } from 'react-router-dom'
import { useSysAuthStore } from '@/store/sysAuthStore'

export default function SysProtectedRoute() {
  const isAuthenticated = useSysAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/sys/login" replace />
}
