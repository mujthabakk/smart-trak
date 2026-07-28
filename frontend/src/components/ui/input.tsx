import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border bg-[var(--card)] px-3 py-1 text-sm text-[var(--foreground)] shadow-xs transition-colors',
          'placeholder:text-[var(--muted-foreground)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[var(--destructive)] focus-visible:ring-[var(--destructive)]'
            : 'border-[var(--border)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
