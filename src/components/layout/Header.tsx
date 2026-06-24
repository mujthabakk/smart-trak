import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'

export function Header() {
  const { toggleSidebar, unreadCount, notifications, markAllRead } = useAppStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const pageTitle = document.title.split(' | ')[0] || 'SmartTrack'

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 bg-[var(--card)]/80 backdrop-blur border-b border-[var(--border)] z-10 flex-shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <h2 className="text-sm font-semibold text-[var(--foreground)] hidden sm:block truncate max-w-48">
            {pageTitle}
          </h2>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Search"
          >
            <Search size={17} />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v)
                setUserMenuOpen(false)
              }}
              className="relative h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-[var(--primary)] hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No notifications</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors',
                          !n.read && 'bg-[var(--primary)]/5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && <div className="h-2 w-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />}
                          <div className={cn('flex-1 min-w-0', n.read && 'pl-4')}>
                            <p className="text-xs font-semibold text-[var(--foreground)] truncate">{n.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Dropdown */}
          <div ref={userMenuRef} className="relative ml-1">
            <button
              onClick={() => {
                setUserMenuOpen((v) => !v)
                setNotifOpen(false)
              }}
              className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-[var(--muted)] transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{user ? getInitials(user.name) : '?'}</AvatarFallback>
              </Avatar>
              <ChevronDown size={13} className="text-[var(--muted-foreground)] hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{user?.email ?? ''}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate(user?.role === 'super_admin' ? '/super-admin/profile' : '/school-admin/profile')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <User size={15} className="text-[var(--muted-foreground)]" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate(user?.role === 'super_admin' ? '/super-admin/settings' : '/school-admin/settings')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <Settings size={15} className="text-[var(--muted-foreground)]" />
                    Settings
                  </button>
                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleLogout()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Search size={18} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted)] font-mono">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
