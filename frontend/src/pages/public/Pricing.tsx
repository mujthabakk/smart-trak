import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Star, ArrowRight, Sparkles } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/siteContent'
import { cn } from '@/lib/utils'

const COMPARISON: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: 'Max students', values: ['200', '500', 'Unlimited'] },
  { label: 'Max buses', values: ['5', '15', 'Unlimited'] },
  { label: 'Max drivers', values: ['10', '25', 'Unlimited'] },
  { label: 'Real-time GPS tracking', values: [true, true, true] },
  { label: 'QR attendance system', values: [true, true, true] },
  { label: 'Push notifications', values: [true, true, true] },
  { label: 'WhatsApp notifications', values: [false, true, true] },
  { label: 'SMS notifications', values: [false, false, true] },
  { label: 'Leave management', values: [false, true, true] },
  { label: 'Lost & found', values: [false, true, true] },
  { label: 'Bus transfer module', values: [false, true, true] },
  { label: 'Guest driver management', values: [false, false, true] },
  { label: 'Training centre', values: [false, true, true] },
  { label: 'Advanced reports & analytics', values: [false, true, true] },
  { label: 'Audit logs', values: [false, false, true] },
  { label: 'Bulk import (schools & students)', values: [false, false, true] },
  { label: 'API access', values: [false, false, true] },
  { label: 'Support', values: ['Email', 'Priority email', 'Dedicated'] },
]

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check size={18} className="text-green-500 mx-auto" />
  if (v === false) return <X size={16} className="text-[var(--muted-foreground)]/40 mx-auto" />
  return <span className="text-sm text-[var(--foreground)]">{v}</span>
}

export default function Pricing() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-3 uppercase tracking-wider">
            <Sparkles size={12} /> Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] leading-tight">Simple, transparent pricing</h1>
          <p className="mt-3 text-lg text-[var(--muted-foreground)]">Pick the plan that fits your fleet. Upgrade or downgrade any time.</p>

          {/* Billing toggle */}
          <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', !annual ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]')}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5', annual ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]')}
            >
              Annual
              <span className={cn('text-[10px] font-bold rounded-full px-1.5 py-0.5', annual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700')}>SAVE 20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const price = annual ? Math.round(plan.monthly * 0.8) : plan.monthly
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  'relative rounded-3xl border bg-[var(--card)] p-7 flex flex-col',
                  plan.popular ? 'border-[var(--primary)] shadow-xl lg:scale-[1.03]' : 'border-[var(--border)]',
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white shadow">
                    <Star size={12} className="fill-white" /> Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-[var(--foreground)]">{plan.name}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1 h-10">{plan.tagline}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-[var(--foreground)]">${price}</span>
                  <span className="text-[var(--muted-foreground)] mb-1.5 text-sm">/ month</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 h-4">{annual ? 'billed annually' : 'billed monthly'}</p>

                <Button
                  className="w-full mt-5"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => navigate('/onboarding')}
                >
                  Get Started <ArrowRight size={16} />
                </Button>

                <div className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[var(--foreground)]">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Comparison table */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-[var(--foreground)] text-center mb-8">Compare all features</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left font-semibold text-[var(--foreground)] px-5 py-4 w-2/5">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className="px-4 py-4 text-center font-semibold text-[var(--foreground)]">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.label} className={cn('border-b border-[var(--border)] last:border-0', i % 2 === 1 && 'bg-[var(--muted)]/30')}>
                    <td className="px-5 py-3 text-[var(--foreground)]">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className="px-4 py-3 text-center"><Cell v={v} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold text-[var(--foreground)]">Still have questions?</h3>
          <p className="text-[var(--muted-foreground)] mt-1 mb-5">Our team is happy to walk you through a demo.</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate('/contact')} variant="outline">Contact Sales</Button>
            <Button onClick={() => navigate('/onboarding')}>Start Onboarding <ArrowRight size={16} /></Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
