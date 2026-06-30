import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Check, X, Pencil, Sparkles, Users, Bus, UserCheck, Calculator,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { mockPlans } from '@/lib/mockData'
import { PLAN_FEATURES } from '@/lib/constants'
import type { Plan } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PLAN_RING: Record<string, string> = {
  basic: 'border-[var(--border)]',
  standard: 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30',
  premium: 'border-[var(--border)]',
}

const FEATURE_MATRIX: Array<{ feature: string; basic: boolean; standard: boolean; premium: boolean }> = [
  { feature: 'Real-time GPS Tracking', basic: true, standard: true, premium: true },
  { feature: 'QR Attendance', basic: true, standard: true, premium: true },
  { feature: 'Push Notifications', basic: true, standard: true, premium: true },
  { feature: 'WhatsApp Notifications', basic: false, standard: true, premium: true },
  { feature: 'SMS Notifications', basic: false, standard: false, premium: true },
  { feature: 'Leave Management', basic: false, standard: true, premium: true },
  { feature: 'Lost & Found', basic: false, standard: true, premium: true },
  { feature: 'Bus Transfer Module', basic: false, standard: true, premium: true },
  { feature: 'Training Centre', basic: false, standard: true, premium: true },
  { feature: 'Guest Driver Module', basic: false, standard: false, premium: true },
  { feature: 'Advanced Reports', basic: false, standard: true, premium: true },
  { feature: 'Full Analytics & Audit Logs', basic: false, standard: false, premium: true },
  { feature: 'API Access', basic: false, standard: false, premium: true },
]

const ALL_FEATURES = FEATURE_MATRIX.map((f) => f.feature)

// Per-student / month cost for each feature
const FEATURE_PRICE: Record<string, number> = {
  'Real-time GPS Tracking':        0.10,
  'QR Attendance':                 0.05,
  'Push Notifications':            0.03,
  'WhatsApp Notifications':        0.08,
  'SMS Notifications':             0.10,
  'Leave Management':              0.05,
  'Lost & Found':                  0.05,
  'Bus Transfer Module':           0.05,
  'Training Centre':               0.04,
  'Guest Driver Module':           0.08,
  'Advanced Reports':              0.06,
  'Full Analytics & Audit Logs':   0.10,
  'API Access':                    0.15,
}

function calcRateFromToggles(toggles: Record<string, boolean>): number {
  return parseFloat(
    ALL_FEATURES
      .filter((f) => toggles[f])
      .reduce((sum, f) => sum + (FEATURE_PRICE[f] ?? 0), 0)
      .toFixed(2),
  )
}

function defaultToggles(planKey: string): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const row of FEATURE_MATRIX) {
    result[row.feature] = planKey === 'premium' ? row.premium : planKey === 'standard' ? row.standard : row.basic
  }
  return result
}

function CheckCell({ on }: { on: boolean }) {
  return on ? (
    <Check size={16} className="text-green-600 mx-auto" />
  ) : (
    <X size={16} className="text-[var(--muted-foreground)]/50 mx-auto" />
  )
}

function limitLabel(n: number): string {
  return n >= 99999 ? 'Unlimited' : formatNumber(n)
}

const EMPTY_EDIT_FORM = {
  label: '', price_monthly: 0, price_annual: 0, price_per_student: 0,
  max_students: 0, max_buses: 0, max_drivers: 0,
}
const EMPTY_CREATE_FORM = {
  label: '', price_monthly: '', price_annual: '', price_per_student: '',
  max_students: '', max_buses: '', max_drivers: '',
}

const PLAN_COLOR: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  standard: 'bg-[var(--primary)]/10 text-[var(--primary)]',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>(mockPlans)

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editToggles, setEditToggles] = useState<Record<string, boolean>>({})

  // ── Create state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [createToggles, setCreateToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_FEATURES.map((f) => [f, false])),
  )

  // ── Dialog auto-calc ──────────────────────────────────────────────────────
  const editCalc = useMemo(() => {
    const n = Number(editForm.max_students) || 0
    const rate = Number(editForm.price_per_student) || 0
    const base = Number(editForm.price_monthly) || 0
    const baseAnnual = Number(editForm.price_annual) || 0
    if (!n || (!base && !rate)) return null
    const studentCost = n * rate
    return {
      n, rate, base, studentCost,
      monthly: base + studentCost,
      annual: baseAnnual + studentCost * 12,
    }
  }, [editForm.max_students, editForm.price_per_student, editForm.price_monthly, editForm.price_annual])

  const createCalc = useMemo(() => {
    const n = Number(createForm.max_students) || 0
    const rate = Number(createForm.price_per_student) || 0
    const base = Number(createForm.price_monthly) || 0
    const baseAnnual = Number(createForm.price_annual) || 0
    if (!n || (!base && !rate)) return null
    const studentCost = n * rate
    return {
      n, rate, base, studentCost,
      monthly: base + studentCost,
      annual: baseAnnual + studentCost * 12,
    }
  }, [createForm.max_students, createForm.price_per_student, createForm.price_monthly, createForm.price_annual])

  // ── Pricing calculator state ───────────────────────────────────────────────
  const [calcStudents, setCalcStudents] = useState('')

  const calcResults = useMemo(() => {
    const n = parseInt(calcStudents) || 0
    return plans.map((p) => {
      const studentCost = n * p.price_per_student
      const monthly = p.price_monthly + studentCost
      const annual = p.price_annual + studentCost * 12
      return { plan: p, monthly, annual, studentCost, n }
    })
  }, [calcStudents, plans])

  function openEdit(plan: Plan) {
    setActivePlan(plan)
    setEditForm({
      label: plan.label,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      price_per_student: plan.price_per_student,
      max_students: plan.max_students,
      max_buses: plan.max_buses,
      max_drivers: plan.max_drivers,
    })
    setEditToggles(defaultToggles(plan.name.toLowerCase()))
    setEditOpen(true)
  }

  function saveEdit() {
    if (!activePlan || !editForm.label.trim()) return
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              label: editForm.label,
              price_monthly: Number(editForm.price_monthly),
              price_annual: Number(editForm.price_annual),
              price_per_student: Number(editForm.price_per_student),
              max_students: Number(editForm.max_students),
              max_buses: Number(editForm.max_buses),
              max_drivers: Number(editForm.max_drivers),
              features: ALL_FEATURES.filter((f) => editToggles[f]),
            }
          : p,
      ),
    )
    setEditOpen(false)
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM)
    setCreateToggles(Object.fromEntries(ALL_FEATURES.map((f) => [f, false])))
    setCreateOpen(true)
  }

  function saveCreate() {
    if (!createForm.label.trim()) return
    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      name: createForm.label.toLowerCase().replace(/\s+/g, '_'),
      label: createForm.label,
      price_monthly: Number(createForm.price_monthly) || 0,
      price_annual: Number(createForm.price_annual) || 0,
      price_per_student: Number(createForm.price_per_student) || 0,
      billing_cycle: 'monthly',
      max_students: Number(createForm.max_students) || 0,
      max_buses: Number(createForm.max_buses) || 0,
      max_drivers: Number(createForm.max_drivers) || 0,
      features: ALL_FEATURES.filter((f) => createToggles[f]),
    }
    setPlans((prev) => [...prev, newPlan])
    setCreateOpen(false)
  }

  const featureLists = useMemo(
    () =>
      plans.map((p) => ({
        id: p.id,
        list: PLAN_FEATURES[p.name as keyof typeof PLAN_FEATURES] ?? p.features,
      })),
    [plans],
  )

  return (
    <Layout>
      <PageHeader
        title="Subscription Plans"
        subtitle="Configure pricing tiers and feature access"
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Create Plan
          </Button>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Plan cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const key = plan.name.toLowerCase()
            const features = featureLists.find((f) => f.id === plan.id)?.list ?? plan.features
            return (
              <motion.div key={plan.id} variants={item}>
                <Card className={`relative rounded-2xl ${PLAN_RING[key] ?? 'border-[var(--border)]'}`}>
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[var(--primary)] text-[var(--primary-foreground)] border-0 gap-1 px-3 py-1">
                        <Sparkles size={12} /> Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-6">
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{plan.label}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold text-[var(--foreground)]">{formatCurrency(plan.price_monthly)}</span>
                      <span className="text-sm text-[var(--muted-foreground)]">/month base</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      or {formatCurrency(plan.price_annual)} billed annually
                    </p>
                    {/* Per-student rate badge */}
                    <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold mt-2 w-fit ${PLAN_COLOR[key] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                      <Users size={11} />
                      {formatCurrency(plan.price_per_student)} / student / month
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-[var(--muted)]/50 p-2">
                        <Users size={14} className="mx-auto text-[var(--muted-foreground)] mb-1" />
                        <p className="text-sm font-semibold text-[var(--foreground)]">{limitLabel(plan.max_students)}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">Students</p>
                      </div>
                      <div className="rounded-lg bg-[var(--muted)]/50 p-2">
                        <Bus size={14} className="mx-auto text-[var(--muted-foreground)] mb-1" />
                        <p className="text-sm font-semibold text-[var(--foreground)]">{limitLabel(plan.max_buses)}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">Buses</p>
                      </div>
                      <div className="rounded-lg bg-[var(--muted)]/50 p-2">
                        <UserCheck size={14} className="mx-auto text-[var(--muted-foreground)] mb-1" />
                        <p className="text-sm font-semibold text-[var(--foreground)]">{limitLabel(plan.max_drivers)}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">Drivers</p>
                      </div>
                    </div>

                    <Separator />

                    <ul className="space-y-2">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <Check size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-[var(--foreground)]">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.is_popular ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => openEdit(plan)}
                    >
                      <Pencil size={14} /> Edit Plan
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── ETA Pricing Calculator ─────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="rounded-2xl border border-[var(--border)]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Calculator size={16} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">Pricing Calculator</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Estimate monthly &amp; annual cost based on student count</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 max-w-xs">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="calc-students">Number of Students</Label>
                  <Input
                    id="calc-students"
                    type="number"
                    min={1}
                    placeholder="e.g. 350"
                    value={calcStudents}
                    onChange={(e) => setCalcStudents(e.target.value)}
                  />
                </div>
              </div>

              {calcStudents && parseInt(calcStudents) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Plan</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Base / mo</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Student cost / mo</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Total / mo</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2">Total / yr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcResults.map(({ plan, monthly, annual, studentCost, n }) => {
                        const key = plan.name.toLowerCase()
                        return (
                          <tr key={plan.id} className={plan.is_popular ? 'font-semibold' : ''}>
                            <td className="py-2 pr-6">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_COLOR[key] ?? ''}`}>
                                {plan.is_popular && <Sparkles size={10} />}
                                {plan.label}
                              </span>
                            </td>
                            <td className="py-2 pr-6 text-[var(--muted-foreground)] tabular-nums">{formatCurrency(plan.price_monthly)}</td>
                            <td className="py-2 pr-6 text-[var(--muted-foreground)] tabular-nums">
                              {n} × {formatCurrency(plan.price_per_student)} = <span className="text-[var(--foreground)]">{formatCurrency(studentCost)}</span>
                            </td>
                            <td className="py-2 pr-6 text-[var(--foreground)] tabular-nums font-semibold">{formatCurrency(monthly)}</td>
                            <td className="py-2 text-[var(--foreground)] tabular-nums">{formatCurrency(annual)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(!calcStudents || parseInt(calcStudents) <= 0) && (
                <p className="text-sm text-[var(--muted-foreground)] italic">Enter student count above to see the cost breakdown across all plans.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature comparison table */}
        <motion.div variants={item}>
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader>
              <h3 className="text-base font-semibold text-[var(--foreground)]">Feature Comparison</h3>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-1/2">Feature</TableHead>
                    <TableHead className="text-center">Basic</TableHead>
                    <TableHead className="text-center">Standard</TableHead>
                    <TableHead className="text-center">Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEATURE_MATRIX.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium text-[var(--foreground)]">{row.feature}</TableCell>
                      <TableCell className="text-center"><CheckCell on={row.basic} /></TableCell>
                      <TableCell className="text-center"><CheckCell on={row.standard} /></TableCell>
                      <TableCell className="text-center"><CheckCell on={row.premium} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Edit Plan Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {activePlan?.label} Plan</DialogTitle>
            <DialogDescription>Set limits first — pricing auto-calculates.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            {/* STEP 1 — Limits */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Plan Limits
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-students">Max Students</Label>
                  <div className="relative">
                    <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="plan-students"
                      type="number"
                      min={0}
                      className="pl-7"
                      value={editForm.max_students}
                      onChange={(e) => {
                        const s = Number(e.target.value)
                        const monthly = Math.round(s * editForm.price_per_student)
                        setEditForm((f) => ({ ...f, max_students: s, price_monthly: monthly, price_annual: Math.round(monthly * 10) }))
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-buses">Max Buses</Label>
                  <div className="relative">
                    <Bus size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="plan-buses"
                      type="number"
                      min={0}
                      className="pl-7"
                      value={editForm.max_buses}
                      onChange={(e) => setEditForm((f) => ({ ...f, max_buses: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-drivers">Max Drivers</Label>
                  <div className="relative">
                    <UserCheck size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="plan-drivers"
                      type="number"
                      min={0}
                      className="pl-7"
                      value={editForm.max_drivers}
                      onChange={(e) => setEditForm((f) => ({ ...f, max_drivers: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2 — Rate + Auto-calculated prices */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Pricing
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-per-student">Price Per Student / Month (USD)</Label>
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-100 dark:bg-amber-900/30 rounded px-1.5 py-0.5">
                    auto from features
                  </span>
                </div>
                <Input
                  id="plan-per-student"
                  type="number"
                  step="0.01"
                  min={0}
                  readOnly
                  className="bg-[var(--muted)]/40 cursor-not-allowed"
                  value={editForm.price_per_student}
                />
                <p className="text-xs text-[var(--muted-foreground)]">Sum of enabled feature costs. Toggle features below to update.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plan-monthly">Monthly Price (USD)</Label>
                    <span className="text-[10px] text-[var(--primary)] font-semibold bg-[var(--primary)]/10 rounded px-1.5 py-0.5">auto</span>
                  </div>
                  <Input
                    id="plan-monthly"
                    type="number"
                    min={0}
                    value={editForm.price_monthly}
                    onChange={(e) => {
                      const monthly = Number(e.target.value)
                      setEditForm((f) => ({ ...f, price_monthly: monthly, price_annual: Math.round(monthly * 10) }))
                    }}
                  />
                  {editForm.max_students > 0 && editForm.price_per_student > 0 && (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {formatNumber(editForm.max_students)} × {formatCurrency(editForm.price_per_student)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plan-annual">Annual Price (USD)</Label>
                    <span className="text-[10px] text-green-600 font-semibold bg-green-100 dark:bg-green-900/30 rounded px-1.5 py-0.5">auto ×10</span>
                  </div>
                  <Input
                    id="plan-annual"
                    type="number"
                    min={0}
                    value={editForm.price_annual}
                    onChange={(e) => setEditForm((f) => ({ ...f, price_annual: Number(e.target.value) }))}
                  />
                  {editForm.price_monthly > 0 && (
                    <p className="text-[11px] text-green-600 font-medium">Save {formatCurrency(editForm.price_monthly * 2)} vs monthly</p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-calculation preview */}
            {editCalc && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  <Calculator size={14} />
                  Auto-calculated at full capacity ({editCalc.n.toLocaleString()} students)
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <span className="text-[var(--muted-foreground)]">Students × rate</span>
                  <span className="tabular-nums font-medium text-[var(--foreground)]">
                    {editCalc.n.toLocaleString()} × {formatCurrency(editCalc.rate)} = {formatCurrency(editCalc.studentCost)}
                  </span>
                  <span className="font-bold text-[var(--foreground)]">Monthly price</span>
                  <span className="tabular-nums font-bold text-[var(--primary)] text-base">{formatCurrency(editCalc.monthly)}</span>
                  <div className="col-span-2 border-t border-[var(--primary)]/20 my-0.5" />
                  <span className="text-[var(--muted-foreground)] text-xs">Monthly × 10</span>
                  <span className="tabular-nums text-xs text-[var(--foreground)]">{formatCurrency(editCalc.monthly)} × 10</span>
                  <span className="font-bold text-[var(--foreground)]">Annual price</span>
                  <span className="tabular-nums font-bold text-green-600 text-base">{formatCurrency(editCalc.annual)}</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Enabling features auto-updates per-student rate & pricing
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_FEATURES.map((feat) => {
                  const price = FEATURE_PRICE[feat] ?? 0
                  const on = editToggles[feat] ?? false
                  return (
                    <div
                      key={feat}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${on ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--foreground)] truncate">{feat}</p>
                        <p className="text-[11px] text-[var(--primary)] font-medium">+{formatCurrency(price)}/student/mo</p>
                      </div>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => {
                          const next = { ...editToggles, [feat]: v }
                          const rate = calcRateFromToggles(next)
                          const monthly = Math.round(editForm.max_students * rate)
                          setEditToggles(next)
                          setEditForm((f) => ({ ...f, price_per_student: rate, price_monthly: monthly, price_annual: Math.round(monthly * 10) }))
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editForm.label.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>Set limits first — pricing auto-calculates.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="new-plan-name">Plan Name</Label>
              <Input
                id="new-plan-name"
                placeholder="e.g. Enterprise"
                value={createForm.label}
                onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            {/* STEP 1 — Limits */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Plan Limits
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-plan-students">Max Students</Label>
                  <div className="relative">
                    <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="new-plan-students"
                      type="number"
                      min={0}
                      placeholder="500"
                      className="pl-7"
                      value={createForm.max_students}
                      onChange={(e) => {
                        const s = e.target.value
                        const monthly = s && createForm.price_per_student
                          ? String(Math.round(Number(s) * Number(createForm.price_per_student)))
                          : createForm.price_monthly
                        const annual = monthly ? String(Math.round(Number(monthly) * 10)) : ''
                        setCreateForm((f) => ({ ...f, max_students: s, price_monthly: monthly, price_annual: annual }))
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-plan-buses">Max Buses</Label>
                  <div className="relative">
                    <Bus size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="new-plan-buses"
                      type="number"
                      min={0}
                      placeholder="15"
                      className="pl-7"
                      value={createForm.max_buses}
                      onChange={(e) => setCreateForm((f) => ({ ...f, max_buses: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-plan-drivers">Max Drivers</Label>
                  <div className="relative">
                    <UserCheck size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="new-plan-drivers"
                      type="number"
                      min={0}
                      placeholder="25"
                      className="pl-7"
                      value={createForm.max_drivers}
                      onChange={(e) => setCreateForm((f) => ({ ...f, max_drivers: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2 — Rate + Auto-calculated prices */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Pricing
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-plan-per-student">Price Per Student / Month (USD)</Label>
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-100 dark:bg-amber-900/30 rounded px-1.5 py-0.5">
                    auto from features
                  </span>
                </div>
                <Input
                  id="new-plan-per-student"
                  type="number"
                  step="0.01"
                  min={0}
                  readOnly
                  className="bg-[var(--muted)]/40 cursor-not-allowed"
                  value={createForm.price_per_student}
                  placeholder="0.00"
                />
                <p className="text-xs text-[var(--muted-foreground)]">Sum of enabled feature costs. Toggle features below to update.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-plan-monthly">Monthly Price (USD)</Label>
                    <span className="text-[10px] text-[var(--primary)] font-semibold bg-[var(--primary)]/10 rounded px-1.5 py-0.5">auto</span>
                  </div>
                  <Input
                    id="new-plan-monthly"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={createForm.price_monthly}
                    onChange={(e) => {
                      const monthly = e.target.value
                      const annual = monthly ? String(Math.round(Number(monthly) * 10)) : ''
                      setCreateForm((f) => ({ ...f, price_monthly: monthly, price_annual: annual }))
                    }}
                  />
                  {createForm.max_students && createForm.price_per_student && (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {Number(createForm.max_students).toLocaleString()} × {formatCurrency(Number(createForm.price_per_student))}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-plan-annual">Annual Price (USD)</Label>
                    <span className="text-[10px] text-green-600 font-semibold bg-green-100 dark:bg-green-900/30 rounded px-1.5 py-0.5">auto ×10</span>
                  </div>
                  <Input
                    id="new-plan-annual"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={createForm.price_annual}
                    onChange={(e) => setCreateForm((f) => ({ ...f, price_annual: e.target.value }))}
                  />
                  {Number(createForm.price_monthly) > 0 && (
                    <p className="text-[11px] text-green-600 font-medium">Save {formatCurrency(Number(createForm.price_monthly) * 2)} vs monthly</p>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-calculation preview */}
            {createCalc && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  <Calculator size={14} />
                  Auto-calculated at full capacity ({createCalc.n.toLocaleString()} students)
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <span className="text-[var(--muted-foreground)]">Students × rate</span>
                  <span className="tabular-nums font-medium text-[var(--foreground)]">
                    {createCalc.n.toLocaleString()} × {formatCurrency(createCalc.rate)} = {formatCurrency(createCalc.studentCost)}
                  </span>
                  <span className="font-bold text-[var(--foreground)]">Monthly price</span>
                  <span className="tabular-nums font-bold text-[var(--primary)] text-base">{formatCurrency(createCalc.monthly)}</span>
                  <div className="col-span-2 border-t border-[var(--primary)]/20 my-0.5" />
                  <span className="text-[var(--muted-foreground)] text-xs">Monthly × 10</span>
                  <span className="tabular-nums text-xs text-[var(--foreground)]">{formatCurrency(createCalc.monthly)} × 10</span>
                  <span className="font-bold text-[var(--foreground)]">Annual price</span>
                  <span className="tabular-nums font-bold text-green-600 text-base">{formatCurrency(createCalc.annual)}</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Enabling features auto-updates per-student rate & pricing
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_FEATURES.map((feat) => {
                  const price = FEATURE_PRICE[feat] ?? 0
                  const on = createToggles[feat] ?? false
                  return (
                    <div
                      key={feat}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${on ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--foreground)] truncate">{feat}</p>
                        <p className="text-[11px] text-[var(--primary)] font-medium">+{formatCurrency(price)}/student/mo</p>
                      </div>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => {
                          const next = { ...createToggles, [feat]: v }
                          const rate = calcRateFromToggles(next)
                          const monthly = createForm.max_students
                            ? String(Math.round(Number(createForm.max_students) * rate))
                            : createForm.price_monthly
                          const annual = monthly ? String(Math.round(Number(monthly) * 10)) : ''
                          setCreateToggles(next)
                          setCreateForm((f) => ({ ...f, price_per_student: String(rate), price_monthly: monthly, price_annual: annual }))
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveCreate} disabled={!createForm.label.trim()}><Plus size={14} /> Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
