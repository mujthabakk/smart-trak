import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, MessageCircle } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { FAQ_GROUPS } from '@/lib/siteContent'
import { cn } from '@/lib/utils'

export default function FAQ() {
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>('Features-0')

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-3 uppercase tracking-wider">
            <Sparkles size={12} /> FAQ
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] leading-tight">Frequently asked questions</h1>
          <p className="mt-3 text-lg text-[var(--muted-foreground)]">Everything about features, setup and data privacy.</p>
        </div>

        <div className="space-y-10">
          {FAQ_GROUPS.map((group) => (
            <div key={group.category}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)] mb-3">{group.category}</h2>
              <div className="space-y-3">
                {group.items.map((item, i) => {
                  const key = `${group.category}-${i}`
                  const isOpen = open === key
                  return (
                    <div key={key} className={cn('rounded-2xl border bg-[var(--card)] transition-colors', isOpen ? 'border-[var(--primary)]/40' : 'border-[var(--border)]')}>
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="font-medium text-[var(--foreground)]">{item.q}</span>
                        <ChevronDown size={18} className={cn('text-[var(--muted-foreground)] flex-shrink-0 transition-transform', isOpen && 'rotate-180 text-[var(--primary)]')} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3">
            <MessageCircle size={22} className="text-[var(--primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Still have questions?</h3>
          <p className="text-[var(--muted-foreground)] mt-1 mb-5">Reach out and we’ll get back to you within one business day.</p>
          <Button onClick={() => navigate('/contact')}>Contact Support</Button>
        </div>
      </div>
    </PublicLayout>
  )
}
