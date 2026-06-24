import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, ArrowLeft, Star, Building2, Mail, Phone, MapPin, Users, Bus } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLANS } from '@/lib/siteContent'
import { cn } from '@/lib/utils'

const STEPS = ['Choose plan', 'School details', 'Confirm']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [planId, setPlanId] = useState('standard')
  const [form, setForm] = useState({
    schoolName: '', email: '', phone: '', address: '', city: '', students: '', buses: '',
  })

  const plan = PLANS.find((p) => p.id === planId)!
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const canNext = step === 0 ? !!planId : step === 1 ? form.schoolName && form.email && form.phone : true

  function next() {
    if (step < 2) setStep((s) => s + 1)
    else navigate('/confirmation')
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)]">Onboard your school</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Three quick steps — credentials arrive by email & WhatsApp.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]')}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={cn('text-sm font-medium hidden sm:block', i === step ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('h-0.5 w-8 sm:w-12 rounded', i < step ? 'bg-green-500' : 'bg-[var(--border)]')} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* Step 1 — Plan */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-semibold text-[var(--foreground)] mb-4">Select a subscription plan</h2>
                <div className="space-y-3">
                  {PLANS.map((p) => {
                    const active = planId === p.id
                    const price = p.monthly
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlanId(p.id)}
                        className={cn('w-full flex items-center justify-between gap-4 rounded-xl border-2 p-4 text-left transition-all',
                          active ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/40')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', active ? 'border-[var(--primary)]' : 'border-[var(--muted-foreground)]/40')}>
                            {active && <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                              {p.name}
                              {p.popular && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-1.5 py-0.5"><Star size={9} className="fill-[var(--primary)]" /> Popular</span>}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">{p.tagline}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[var(--foreground)]">${price}<span className="text-xs font-normal text-[var(--muted-foreground)]">/mo</span></p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2 — Details */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-semibold text-[var(--foreground)] mb-4">Tell us about your school</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="o-school">School name *</Label>
                    <div className="relative"><Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-school" className="pl-9" value={form.schoolName} onChange={set('schoolName')} placeholder="Greenfield Academy" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-email">Contact email *</Label>
                    <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-email" type="email" className="pl-9" value={form.email} onChange={set('email')} placeholder="admin@school.ae" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-phone">Phone number *</Label>
                    <div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-phone" className="pl-9" value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" /></div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="o-addr">School address</Label>
                    <div className="relative"><MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-addr" className="pl-9" value={form.address} onChange={set('address')} placeholder="Street, area" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-city">City / State</Label>
                    <Input id="o-city" value={form.city} onChange={set('city')} placeholder="Dubai" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-students">Estimated students</Label>
                    <div className="relative"><Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-students" type="number" className="pl-9" value={form.students} onChange={set('students')} placeholder="350" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-buses">Estimated buses</Label>
                    <div className="relative"><Bus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input id="o-buses" type="number" className="pl-9" value={form.buses} onChange={set('buses')} placeholder="8" /></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Confirm */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-semibold text-[var(--foreground)] mb-4">Review & confirm</h2>
                <div className="rounded-xl bg-[var(--muted)]/40 p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">Selected plan</p>
                    <p className="font-semibold text-[var(--foreground)]">{plan.name} — ${plan.monthly}/mo</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Change</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['School', form.schoolName || '—'],
                    ['Email', form.email || '—'],
                    ['Phone', form.phone || '—'],
                    ['Address', form.address || '—'],
                    ['City / State', form.city || '—'],
                    ['Est. students', form.students || '—'],
                    ['Est. buses', form.buses || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-[var(--border)] py-2 text-sm">
                      <span className="text-[var(--muted-foreground)]">{k}</span>
                      <span className="font-medium text-[var(--foreground)] text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-4">By submitting, a pending school record is created for Super Admin review. On approval, your console URL and temporary credentials are sent by email and WhatsApp.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav */}
          <div className="flex items-center justify-between mt-8">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate('/pricing') : setStep((s) => s - 1))}>
              <ArrowLeft size={16} /> {step === 0 ? 'Plans' : 'Back'}
            </Button>
            <Button onClick={next} disabled={!canNext}>
              {step === 2 ? 'Submit Application' : 'Continue'} <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
