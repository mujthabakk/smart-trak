import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIAssistant } from '@/components/shared/AIAssistant'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateUser, stopImpersonation } from '@/store/slices/authSlice'
import { fetchMe } from '@/lib/api/auth'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children?: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const impersonatorUser = useAppSelector((s) => s.auth.impersonatorUser)
  const impersonatedSchoolId = useAppSelector((s) => s.auth.user?.school_id)
  const sidebarCollapsed = useAppSelector((s) => s.app.sidebarCollapsed)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  function returnToSuperAdmin() {
    dispatch(stopImpersonation())
    navigate(impersonatedSchoolId ? `/super-admin/schools/${impersonatedSchoolId}` : '/super-admin/schools')
  }

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
        {impersonatorUser && (
          <div className="flex items-center justify-center gap-3 bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]">
            <span>
              Logged in as this school&apos;s admin, on behalf of <strong>{impersonatorUser.name}</strong>.
            </span>
            <button
              onClick={returnToSuperAdmin}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25 transition-colors"
            >
              <LogOut size={13} /> Return to Super Admin
            </button>
          </div>
        )}
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
