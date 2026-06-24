import type { ComponentType, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}
    >
      {/* Icon wrapper with layered circles */}
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 rounded-full bg-[var(--muted)] opacity-30" />
        <div className="absolute inset-0 scale-125 rounded-full bg-[var(--muted)] opacity-50" />
        <div className="relative h-20 w-20 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <Icon
            size={36}
            className="text-[var(--muted-foreground)]"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-sm leading-relaxed">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}

export default EmptyState
