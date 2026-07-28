import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { Construction, ArrowLeft, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface ComingSoonProps {
  title: string
  description?: string
  icon?: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
  features?: string[]
}

export function ComingSoon({ title, description, icon: Icon = Construction, features }: ComingSoonProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 scale-150 rounded-full bg-[var(--primary)]/10 blur-2xl" />
        <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-xl">
          <Icon size={44} className="text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)] mb-4">
          <Sparkles size={12} />
          In Development
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">{title}</h1>
        <p className="text-[var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
          {description ??
            `The ${title} module is being crafted with the same care as the rest of SmartTrack. The full interactive experience lands here soon.`}
        </p>

        {features && features.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
            {features.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default ComingSoon
