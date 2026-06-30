import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ArrowRight, ArrowLeft, Star, Building2, Mail, Phone, MapPin,
  Users, Bus, AlertTriangle, Calculator, ChevronRight,
} from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLANS } from '@/lib/siteContent'
import { cn } from '@/lib/utils'

const STEPS = ['Choose plan', 'School details', 'Confirm']

function formatUSD(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [planId, setPlanId] = useState('standard')

  // Student count lives on step 0 so plan filtering works live
  const [studentFilter, setStudentFilter] = useState('')

  const [form, setForm] = useState({
    schoolName: '', email: '', phone: '', address: '', city: '', students: '', buses: '',
  })

  const plan = PLANS.find((p) => p.id === planId)!
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Sync studentFilter → form.students when moving from step 0
  function handleNext() {
    if (step === 0) {
      // Pre-fill students from the filter input
      if (studentFilter && !form.students) {
        setForm((f) => ({ ...f, students: studentFilter }))
      }
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    } else {
      navigate('/confirmation')
    }
  }

  const filterCount = parseInt(studentFilter) || 0

  // Determine plan eligibility based on student count
  function planStatus(p: typeof PLANS[0]) {
    if (!filterCount) return 'available'
    if (filterCount <= p.maxStudents) return 'available'
    return 'exceeded'
  }

  // Auto-recommend the cheapest plan that fits
  const recommendedId = useMemo(() => {
    if (!filterCount) return null
    const fit = PLANS.find((p) => filterCount <= p.maxStudents)
    return fit?.id ?? null
  }, [filterCount])

  // Cost calculation for step 1
  const costCalc = useMemo(() => {
    const n = parseInt(form.students) || 0
    if (!n || !plan) return null
    const studentCost = n * plan.pricePerStudent
    const monthly = plan.monthly + studentCost
    const annual = monthly * 12 * 0.8 // 20% annual discount
    return { base: plan.monthly, studentCost, monthly, annual, n, rate: plan.pricePerStudent }
  }, [form.students, plan])

  const canNext =
    step === 0 ? !!planId :
    step === 1 ? !!(form.schoolName && form.email && form.phone) :
    true

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)]">Onboard your school</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Three quick steps — credentials arrive by email &amp; WhatsApp.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]',
                )}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={cn('text-sm font-medium hidden sm:block', i === step ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]')}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-8 sm:w-12 rounded', i < step ? 'bg-green-500' : 'bg-[var(--border)]')} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <AnimatePresence mode="wait">

            {/* ── Step 0 — Plan selection ─────────────────────────────── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <h2 className="font-semibold text-[var(--foreground)]">Select a subscription plan</h2>

                {/* Student count filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="filter-students">How many students does your school have?</Label>
                  <div className="relative max-w-xs">
                    <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="filter-students"
                      type="number"
                      min={1}
                      className="pl-9"
                      placeholder="e.g. 350"
                      value={studentFilter}
                      onChange={(e) => setStudentFilter(e.target.value)}
                    />
                  </div>
                  {filterCount > 0 && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Showing plans that support <span className="font-semibold text-[var(--foreground)]">{filterCount.toLocaleString()}</span> students.
                      {recommendedId && (
                        <span className="ml-1 text-[var(--primary)] font-medium">
                          Recommended: {PLANS.find(p => p.id === recommendedId)?.name}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Plan cards */}
                <div className="space-y-3">
                  {PLANS.map((p) => {
                    const active = planId === p.id
                    const status = planStatus(p)
                    const exceeded = status === 'exceeded'
                    const isRecommended = recommendedId === p.id && filterCount > 0
                    const estMonthly = filterCount > 0 ? p.monthly + filterCount * p.pricePerStudent : null

                    return (
                      <button
                        key={p.id}
                        onClick={() => !exceeded && setPlanId(p.id)}
                        disabled={exceeded}
                        className={cn(
                          'w-full flex items-start justify-between gap-4 rounded-xl border-2 p-4 text-left transition-all',
                          exceeded
                            ? 'border-[var(--border)] opacity-40 cursor-not-allowed bg-[var(--muted)]/20'
                            : active
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] hover:border-[var(--primary)]/40',
                        )}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                            active && !exceeded ? 'border-[var(--primary)]' : 'border-[var(--muted-foreground)]/40',
                          )}>
                            {active && !exceeded && <div className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--foreground)] flex flex-wrap items-center gap-2">
                              {p.name}
                              {p.popular && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-1.5 py-0.5">
                                  <Star size={9} className="fill-[var(--primary)]" /> Popular
                                </span>
                              )}
                              {isRecommended && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full px-1.5 py-0.5">
                                  <Check size={9} /> Best fit
                                </span>
                              )}
                              {exceeded && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-900/30 rounded-full px-1.5 py-0.5">
                                  <AlertTriangle size={9} /> Exceeds limit
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.tagline}</p>
                            {/* Limits row */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                                <Users size={11} /> Up to {p.limits.students} students
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                                <Bus size={11} /> {p.limits.buses} buses
                              </span>
                            </div>
                            {/* Live cost estimate */}
                            {estMonthly !== null && !exceeded && (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                                <Calculator size={11} />
                                Est. {formatUSD(estMonthly)}/mo for {filterCount.toLocaleString()} students
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[var(--foreground)]">
                            ${p.monthly}<span className="text-xs font-normal text-[var(--muted-foreground)]">/mo</span>
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">base price</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">+${p.pricePerStudent}/student</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {filterCount > 0 && !recommendedId && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>Your student count exceeds all standard plan limits. Please contact us for an Enterprise quote.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 1 — School details ─────────────────────────────── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="font-semibold text-[var(--foreground)] mb-1">Tell us about your school</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="o-school">School name *</Label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-school" className="pl-9" value={form.schoolName} onChange={set('schoolName')} placeholder="Greenfield Academy" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-email">Contact email *</Label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-email" type="email" className="pl-9" value={form.email} onChange={set('email')} placeholder="admin@school.ae" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-phone">Phone number *</Label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-phone" className="pl-9" value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="o-addr">School address</Label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-addr" className="pl-9" value={form.address} onChange={set('address')} placeholder="Street, area" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-city">City / State</Label>
                    <Input id="o-city" value={form.city} onChange={set('city')} placeholder="Dubai" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-students">Estimated students</Label>
                    <div className="relative">
                      <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-students" type="number" min={1} className="pl-9" value={form.students} onChange={set('students')} placeholder="350" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="o-buses">Estimated buses</Label>
                    <div className="relative">
                      <Bus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input id="o-buses" type="number" min={1} className="pl-9" value={form.buses} onChange={set('buses')} placeholder="8" />
                    </div>
                  </div>
                </div>

                {/* Live cost calculation */}
                {costCalc && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                      <Calculator size={15} />
                      Cost Estimate — {plan.name} Plan
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <span className="text-[var(--muted-foreground)]">Base price</span>
                      <span className="tabular-nums font-medium text-[var(--foreground)]">{formatUSD(costCalc.base)} / mo</span>

                      <span className="text-[var(--muted-foreground)]">Student cost</span>
                      <span className="tabular-nums font-medium text-[var(--foreground)]">
                        {costCalc.n.toLocaleString()} × {formatUSD(costCalc.rate)} = {formatUSD(costCalc.studentCost)} / mo
                      </span>

                      <div className="col-span-2 border-t border-[var(--primary)]/20 my-1" />

                      <span className="font-semibold text-[var(--foreground)]">Total monthly</span>
                      <span className="tabular-nums font-bold text-[var(--primary)] text-base">{formatUSD(costCalc.monthly)}</span>

                      <span className="text-[var(--muted-foreground)] text-xs">Annual (save 20%)</span>
                      <span className="tabular-nums text-xs font-semibold text-green-600">{formatUSD(costCalc.annual)} / yr</span>
                    </div>

                    {/* Plan limit warning */}
                    {costCalc.n > plan.maxStudents && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/20 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                        <span>
                          {costCalc.n.toLocaleString()} students exceeds the {plan.name} plan limit ({plan.limits.students}).
                          <button onClick={() => setStep(0)} className="ml-1 font-semibold underline underline-offset-2 hover:no-underline">
                            Change plan <ChevronRight size={11} className="inline" />
                          </button>
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Step 2 — Confirm ────────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-semibold text-[var(--foreground)] mb-4">Review &amp; confirm</h2>

                {/* Plan + cost summary */}
                <div className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-4 mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Selected plan</p>
                      <p className="font-semibold text-[var(--foreground)]">{plan.name} — ${plan.monthly}/mo base</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Change</Button>
                  </div>
                  {costCalc && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm border-t border-[var(--primary)]/20 pt-2">
                      <span className="text-[var(--muted-foreground)]">Student cost ({costCalc.n} × {formatUSD(costCalc.rate)})</span>
                      <span className="tabular-nums font-medium text-[var(--foreground)]">{formatUSD(costCalc.studentCost)}/mo</span>
                      <span className="font-semibold text-[var(--foreground)]">Est. total monthly</span>
                      <span className="tabular-nums font-bold text-[var(--primary)]">{formatUSD(costCalc.monthly)}</span>
                    </div>
                  )}
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
                      <span className="font-medium text-[var(--foreground)] text-right max-w-[55%] truncate">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-4">
                  By submitting, a pending school record is created for Super Admin review. On approval, your console URL and temporary credentials are sent by email and WhatsApp.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav */}
          <div className="flex items-center justify-between mt-8">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate('/pricing') : setStep((s) => s - 1))}>
              <ArrowLeft size={16} /> {step === 0 ? 'Plans' : 'Back'}
            </Button>
            <Button onClick={handleNext} disabled={!canNext}>
              {step === 2 ? 'Submit Application' : 'Continue'} <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
