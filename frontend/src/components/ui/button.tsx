import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm active:scale-[0.98]',
        destructive: 'bg-[var(--destructive)] text-white hover:opacity-90 shadow-sm',
        outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)]',
        secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90',
        ghost: 'hover:bg-[var(--muted)] text-[var(--foreground)]',
        link: 'text-[var(--primary)] underline-offset-4 hover:underline p-0 h-auto',
        success: 'bg-[var(--success)] text-white hover:opacity-90 shadow-sm',
        warning: 'bg-[var(--warning)] text-white hover:opacity-90 shadow-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-md',
        lg: 'h-11 px-8 text-base rounded-xl',
        xl: 'h-12 px-10 text-base rounded-xl',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
