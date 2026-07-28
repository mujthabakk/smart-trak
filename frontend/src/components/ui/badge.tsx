import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]',
        secondary: 'border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]',
        destructive: 'border-transparent bg-red-100 text-red-700',
        outline: 'border-[var(--border)] text-[var(--foreground)]',
        success: 'border-transparent bg-green-100 text-green-700',
        warning: 'border-transparent bg-yellow-100 text-yellow-700',
        info: 'border-transparent bg-blue-100 text-blue-700',
        muted: 'border-transparent bg-[var(--muted)] text-[var(--muted-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
