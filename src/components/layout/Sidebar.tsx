import { useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  School,
  CreditCard,
  Package,
  MessageSquare,
  LifeBuoy,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  GraduationCap,
  UserCheck,
  Route,
  Map,
  CalendarCheck,
  CalendarOff,
  Bell,
  ArrowLeftRight,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { SIDEBAR_NAV } from '@/lib/constants'
import { cn, getInitials, getRoleLabel } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  School,
  CreditCard,
  Package,
  MessageSquare,
  LifeBuoy,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  GraduationCap,
  UserCheck,
  Bus,
  Route,
  Map,
  CalendarCheck,
  CalendarOff,
  Bell,
  ArrowLeftRight,
  UserPlus,
}

const SIDEBAR_EXPANDED_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

export function Sidebar() {
  const { user, role, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const navigate = useNavigate()
  const navRef = useRef<HTMLDivElement>(null)

  const navKey = role === 'super_admin' ? 'super_admin' : 'school_admin'
  const navItems = SIDEBAR_NAV[navKey] ?? []

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-30 flex flex-col overflow-hidden',
          'bg-[var(--sidebar-bg,#1e1b4b)] text-[var(--sidebar-text,#e2e8f0)]',
          'border-r border-white/10 shadow-xl',
          // On mobile, hide unless open
          sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center h-14 px-4 border-b border-white/10 flex-shrink-0',
            sidebarCollapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bus size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-base text-white whitespace-nowrap"
              >
                SmartTrack
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav ref={navRef} className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150 relative',
                    isActive
                      ? 'bg-[var(--sidebar-active,var(--primary))] text-white shadow-sm'
                      : 'text-[var(--sidebar-text,#cbd5e1)] hover:bg-[var(--sidebar-hover,rgba(255,255,255,0.1))] hover:text-[var(--sidebar-active,#ffffff)]',
                    sidebarCollapsed ? 'justify-center' : 'gap-3',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={cn('flex-shrink-0', isActive ? 'text-white' : '')} />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                          className="flex-1 whitespace-nowrap truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {item.badge !== undefined && item.badge > 0 && (
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                              'ml-auto h-5 min-w-5 rounded-full px-1 text-[10px] font-bold flex items-center justify-center',
                              isActive ? 'bg-white text-[var(--primary)]' : 'bg-[var(--primary)] text-white',
                            )}
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    )}
                    {/* Collapsed tooltip */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 z-50 hidden group-hover:block">
                        <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                          {item.label}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User profile + logout */}
        <div className="flex-shrink-0 border-t border-white/10 p-3">
          <div
            className={cn(
              'flex items-center rounded-lg p-2 gap-3 mb-2',
              sidebarCollapsed && 'justify-center',
            )}
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
              {user ? getInitials(user.name) : '?'}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && user && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-white/60 truncate">{getRoleLabel(user.role)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center rounded-lg px-2 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors',
              sidebarCollapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute top-5 -right-4 h-8 w-8 rounded-full',
            'border-2 border-[var(--primary)]/40 bg-white dark:bg-gray-800',
            'shadow-[0_2px_8px_rgba(0,0,0,0.18)]',
            'text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]',
            'flex items-center justify-center transition-all duration-150 z-40',
            'hidden lg:flex',
          )}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </motion.aside>
    </>
  )
}

export default Sidebar
