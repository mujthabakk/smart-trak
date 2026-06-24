import type { ComponentType } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: ComponentType<{ className?: string; size?: number }>
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  subtitle?: string
  onClick?: () => void
}

const COLOR_MAP: Record<string, { gradient: string; text: string; light: string }> = {
  primary: {
    gradient: 'from-[var(--primary)] to-[var(--primary-hover,color-mix(in_srgb,var(--primary)_80%,black))]',
    text: 'text-[var(--primary)]',
    light: 'bg-[var(--primary)]/10',
  },
  success: {
    gradient: 'from-green-500 to-green-600',
    text: 'text-green-600',
    light: 'bg-green-50 dark:bg-green-900/20',
  },
  warning: {
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-600',
    light: 'bg-amber-50 dark:bg-amber-900/20',
  },
  danger: {
    gradient: 'from-red-500 to-red-600',
    text: 'text-red-600',
    light: 'bg-red-50 dark:bg-red-900/20',
  },
  info: {
    gradient: 'from-blue-500 to-cyan-500',
    text: 'text-blue-600',
    light: 'bg-blue-50 dark:bg-blue-900/20',
  },
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-[var(--muted)]', className)} />
  )
}

export function StatsCard({ title, value, change, icon: Icon, color, loading, subtitle, onClick }: StatsCardProps) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.primary
  const isPositive = change !== undefined && change >= 0
  const isNegative = change !== undefined && change < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={cn(
        'relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
    >
      {loading ? (
        <div className="flex items-start gap-4">
          <SkeletonPulse className="h-14 w-14 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-7 w-16" />
            <SkeletonPulse className="h-3 w-20" />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm',
              colors.gradient,
            )}
          >
            <Icon className="text-white" size={24} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--muted-foreground)] font-medium truncate">{title}</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-0.5 tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{subtitle}</p>
            )}
            {change !== undefined && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 mt-1.5 text-xs font-medium rounded-full px-2 py-0.5',
                  isPositive && 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
                  isNegative && 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
                )}
              >
                {isPositive ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {Math.abs(change)}% vs last period
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default StatsCard
