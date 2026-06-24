import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse'
  className?: string
}

const SPINNER_SIZE: Record<string, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
}

const DOT_SIZE: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
  lg: 'h-3.5 w-3.5',
}

const PULSE_SIZE: Record<string, string> = {
  sm: 'h-6 w-6',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

export function LoadingSpinner({ size = 'md', variant = 'spinner', className }: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-[var(--primary)] animate-bounce',
              DOT_SIZE[size],
            )}
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        <div
          className={cn(
            'absolute rounded-full bg-[var(--primary)] opacity-30 animate-ping',
            PULSE_SIZE[size],
          )}
        />
        <div
          className={cn(
            'rounded-full bg-[var(--primary)]',
            size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8',
          )}
        />
      </div>
    )
  }

  // Default: spinner
  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        'border-[var(--primary)] border-t-transparent',
        SPINNER_SIZE[size],
        className,
      )}
    />
  )
}

export default LoadingSpinner
