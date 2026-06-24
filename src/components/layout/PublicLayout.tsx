import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, useScroll } from 'framer-motion'
import { Bus, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PUBLIC_NAV } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface PublicLayoutProps {
  children?: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { scrollYProgress } = useScroll()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-1 bg-[var(--primary)] origin-left z-[60]"
      />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
              <Bus size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--foreground)]">SmartTrack</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Try For Free
            </Button>
            <Button variant="secondary" onClick={() => navigate('/onboarding')}>Subscribe Now</Button>
          </div>

          <button
            className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)]"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 space-y-1"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)]"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                Try For Free
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/onboarding')}>
                Subscribe Now
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">{children ?? <Outlet />}</main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <Bus size={18} className="text-white" />
                </div>
                <span className="font-bold text-[var(--foreground)]">SmartTrack</span>
              </Link>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                The smartest way to manage school bus fleets and keep every student safe.
              </p>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies', 'Licenses'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <span className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] cursor-pointer transition-colors">
                        {l}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              © 2026 SmartTrack by Akira Software Solutions. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
              <span>www.smarttrack.live</span>
              <span className="hidden sm:inline">·</span>
              <span>sales@akiraplc.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
