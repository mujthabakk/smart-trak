import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Breadcrumb {
  label: string
  path?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
  className?: string
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('mb-6', className)}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight size={14} className="text-[var(--muted-foreground)] flex-shrink-0" />
              )}
              {crumb.path && i < breadcrumbs.length - 1 ? (
                <Link
                  to={crumb.path}
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'text-sm',
                    i === breadcrumbs.length - 1
                      ? 'text-[var(--foreground)] font-medium'
                      : 'text-[var(--muted-foreground)]',
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--foreground)] leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default PageHeader
