import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIAssistant } from '@/components/shared/AIAssistant'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateUser } from '@/store/slices/authSlice'
import { fetchMe } from '@/lib/api/auth'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children?: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const sidebarCollapsed = useAppSelector((s) => s.app.sidebarCollapsed)
  const dispatch = useAppDispatch()

  // The cached user in localStorage is only as fresh as the last login — it
  // never picks up server-side additions (e.g. plan_type) on its own. One
  // /auth/me refresh per session keeps it in sync without forcing a re-login.
  useEffect(() => {
    if (!isAuthenticated) return
    fetchMe()
      .then((user) => dispatch(updateUser(user)))
      .catch(() => {
        // Non-fatal — the page just keeps using its existing cached user.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />

      {/* Main column shifts to make room for the fixed sidebar on desktop */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
        )}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {children ?? <Outlet />}
        </main>
      </div>
      <AIAssistant />
    </div>
  )
}

export default Layout
