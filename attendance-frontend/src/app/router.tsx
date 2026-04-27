import { createBrowserRouter, Navigate } from 'react-router-dom'
import ErrorPage from '@/components/ErrorPage'
import LoginPage from '@/features/auth/LoginPage'
import ChangePasswordPage from '@/features/auth/ChangePasswordPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import SchedulesPage  from '@/features/schedules/SchedulesPage'
import MessagesPage   from '@/features/messages/MessagesPage'
import CheckerPage from '@/features/checker/CheckerPage'
import ReportsPage     from '@/features/reports/ReportsPage'
import CompanyPage     from '@/features/company/CompanyPage'
import OrganizationPage from '@/features/organization/OrganizationPage'
import SettingsPage       from '@/features/settings/SettingsPage'
import RegisterPage       from '@/features/settings/RegisterPage'
import NotificationsPage   from '@/features/notifications/NotificationsPage'
// ── Sys (superadmin) ──────────────────────────────────────────────────────────
import SysLoginPage         from '@/features/sys/SysLoginPage'
import SysProtectedRoute    from '@/features/sys/SysProtectedRoute'
import SysLayout            from '@/features/sys/SysLayout'
import SysDashboardPage     from '@/features/sys/pages/SysDashboardPage'
import SysTenantsPage       from '@/features/sys/pages/SysTenantsPage'
import SysTenantDetailPage  from '@/features/sys/pages/SysTenantDetailPage'
import SysPlansPage         from '@/features/sys/pages/SysPlansPage'
import SysSubscriptionsPage        from '@/features/sys/pages/SysSubscriptionsPage'
import SysSubscriptionHistoryPage  from '@/features/sys/pages/SysSubscriptionHistoryPage'
import SysInvoicesPage             from '@/features/sys/pages/SysInvoicesPage'
import SysSettingsPage      from '@/features/sys/pages/SysSettingsPage'
import SysUsersPage         from '@/features/sys/pages/SysUsersPage'

export const router = createBrowserRouter([
  { path: '/login',            element: <LoginPage />,           errorElement: <ErrorPage /> },
  { path: '/change-password',  element: <ChangePasswordPage />,  errorElement: <ErrorPage /> },
  { path: '/checker',          element: <CheckerPage />,         errorElement: <ErrorPage /> },
  { path: '/register/:token',  element: <RegisterPage />,        errorElement: <ErrorPage /> },

  // ── Tenant panel ────────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <Layout />,
        errorElement: <ErrorPage />,
        children: [
          { path: '/',          element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/employees',    element: <EmployeesPage /> },
          { path: '/organization', element: <OrganizationPage /> },
          { path: '/schedules',    element: <SchedulesPage /> },
          { path: '/attendance',element: <AttendancePage /> },
          { path: '/messages',  element: <MessagesPage /> },
          { path: '/reports',   element: <ReportsPage /> },
          { path: '/company',        element: <CompanyPage /> },
          { path: '/settings',       element: <SettingsPage /> },
          { path: '/notifications',  element: <NotificationsPage /> },
        ],
      },
    ],
  },

  // ── Sys panel (superadmin) ───────────────────────────────────────────────────
  { path: '/sys/login', element: <SysLoginPage />, errorElement: <ErrorPage /> },
  {
    element: <SysProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <SysLayout />,
        errorElement: <ErrorPage />,
        children: [
          { path: '/sys',                    element: <SysDashboardPage /> },
          { path: '/sys/tenants',            element: <SysTenantsPage /> },
          { path: '/sys/tenants/:id',        element: <SysTenantDetailPage /> },
          { path: '/sys/plans',              element: <SysPlansPage /> },
          { path: '/sys/subscriptions',                      element: <SysSubscriptionsPage /> },
          { path: '/sys/subscriptions/:tenantId/history',   element: <SysSubscriptionHistoryPage /> },
          { path: '/sys/invoices',           element: <SysInvoicesPage /> },
          { path: '/sys/users',              element: <SysUsersPage /> },
          { path: '/sys/settings',          element: <SysSettingsPage /> },
          { path: '/sys/notifications',     element: <NotificationsPage variant="sys" /> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
