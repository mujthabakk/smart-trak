import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIAssistant } from '@/components/shared/AIAssistant'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children?: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuthStore()
  const { sidebarCollapsed } = useAppStore()

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
