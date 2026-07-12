import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

// Route-level code splitting: each page becomes its own chunk, so the
// Recharts-heavy pages (Overview, Analytics) no longer sit in the entry graph.
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Overview = lazy(() => import('@/pages/Overview'))
const Apps = lazy(() => import('@/pages/Apps'))
const AppSettings = lazy(() => import('@/pages/AppSettings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const NotificationDetail = lazy(() => import('@/pages/NotificationDetail'))
const UsersPage = lazy(() => import('@/pages/Users'))
const Devices = lazy(() => import('@/pages/Devices'))
const Segments = lazy(() => import('@/pages/Segments'))
const Topics = lazy(() => import('@/pages/Topics'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Logs = lazy(() => import('@/pages/Logs'))
const Keys = lazy(() => import('@/pages/Keys'))
const SettingsPage = lazy(() => import('@/pages/Settings'))

/** Minimal centered spinner shown while a route chunk loads. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Overview />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/apps/:id/settings" element={<AppSettings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/:id" element={<NotificationDetail />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
