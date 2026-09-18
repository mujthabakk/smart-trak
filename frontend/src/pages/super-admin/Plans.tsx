import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Check, X, Pencil, Sparkles, Users, Bus, UserCheck, Calculator, AlertCircle, Trash2,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
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
import { isAxiosError } from 'axios'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { listPlans, createPlan, updatePlan, deletePlan } from '@/lib/api/plans'
import { listFeatureCatalog, createFeatureCatalogItem, deleteFeatureCatalogItem } from '@/lib/api/featureCatalog'
import type { Plan, PlanFeature } from '@/types'

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || fallback
  }
  return fallback
}

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

function exampleStudentCount(maxStudents: number): number {
  return maxStudents >= 99999 ? 1000 : maxStudents
}

const EMPTY_EDIT_FORM = {
  label: '', price_monthly: 0, price_annual: 0,
  max_students: 0, max_buses: 0, max_drivers: 0,
}
const EMPTY_CREATE_FORM = {
  label: '', price_monthly: '', price_annual: '',
  max_students: '', max_buses: '', max_drivers: '',
}

const PLAN_COLOR: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  standard: 'bg-[var(--primary)]/10 text-[var(--primary)]',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function Plans() {
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  const { data: featureCatalog = [] } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: listFeatureCatalog,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Plan>) => createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setCreateOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Plan> }) => updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setEditOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setDeleteTarget(null)
    },
  })
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([])

  // ── Create state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [createFeatures, setCreateFeatures] = useState<PlanFeature[]>([])

  // ── Inline "add feature to catalog" — no separate page needed ─────────────
  const [newEditFeature, setNewEditFeature] = useState('')
  const [newCreateFeature, setNewCreateFeature] = useState('')
  const [addFeatureError, setAddFeatureError] = useState('')
  const [addingFeature, setAddingFeature] = useState(false)

  // ── Dialog auto-calc — example total at this plan's student count ────────
  const editCalc = useMemo(() => {
    const n = Number(editForm.max_students) || 0
    const rate = Number(editForm.price_annual) || 0
    if (!n || !rate) return null
    return { n, rate, annual: n * rate, monthly: n * (Number(editForm.price_monthly) || 0) }
  }, [editForm.max_students, editForm.price_annual, editForm.price_monthly])

  const createCalc = useMemo(() => {
    const n = Number(createForm.max_students) || 0
    const rate = Number(createForm.price_annual) || 0
    if (!n || !rate) return null
    return { n, rate, annual: n * rate, monthly: n * (Number(createForm.price_monthly) || 0) }
  }, [createForm.max_students, createForm.price_annual, createForm.price_monthly])

  // ── Pricing calculator state ───────────────────────────────────────────────
  const [calcStudents, setCalcStudents] = useState('')

  const calcResults = useMemo(() => {
    const n = parseInt(calcStudents) || 0
    return plans.map((p) => ({ plan: p, monthly: n * p.price_monthly, annual: n * p.price_annual, n }))
  }, [calcStudents, plans])

  function openEdit(plan: Plan) {
    setActivePlan(plan)
    setEditForm({
      label: plan.label,
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      max_students: plan.max_students,
      max_buses: plan.max_buses,
      max_drivers: plan.max_drivers,
    })
    setEditFeatures(plan.features.map((f) => ({ ...f })))
    setNewEditFeature('')
    setAddFeatureError('')
    setEditOpen(true)
  }

  function saveEdit() {
    if (!activePlan || !editForm.label.trim()) return
    updateMutation.mutate({
      id: activePlan.id,
      payload: {
        label: editForm.label,
        price_monthly: Number(editForm.price_monthly),
        price_annual: Number(editForm.price_annual),
        max_students: Number(editForm.max_students),
        max_buses: Number(editForm.max_buses),
        max_drivers: Number(editForm.max_drivers),
        features: editFeatures.filter((f) => f.name.trim()),
      },
    })
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM)
    setCreateFeatures([])
    setNewCreateFeature('')
    setAddFeatureError('')
    setCreateOpen(true)
  }

  function saveCreate() {
    if (!createForm.label.trim()) return
    createMutation.mutate({
      name: createForm.label.toLowerCase().replace(/\s+/g, '_'),
      label: createForm.label,
      price_monthly: Number(createForm.price_monthly) || 0,
      price_annual: Number(createForm.price_annual) || 0,
      billing_cycle: 'monthly',
      max_students: Number(createForm.max_students) || 0,
      max_buses: Number(createForm.max_buses) || 0,
      max_drivers: Number(createForm.max_drivers) || 0,
      features: createFeatures.filter((f) => f.name.trim()),
    })
  }

  function toggleFeature(list: PlanFeature[], setList: (v: PlanFeature[]) => void, name: string, on: boolean) {
    if (on) {
      setList([...list, { name, price: 0 }])
    } else {
      setList(list.filter((f) => f.name !== name))
    }
  }

  // Adds a brand-new feature straight from the plan dialog — no separate
  // "Plan Features" page needed — and turns it on for the plan being edited.
  async function addNewFeature(target: 'edit' | 'create') {
    const name = (target === 'edit' ? newEditFeature : newCreateFeature).trim()
    if (!name) return
    setAddingFeature(true)
    setAddFeatureError('')
    try {
      const created = await createFeatureCatalogItem(name)
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      if (target === 'edit') {
        toggleFeature(editFeatures, setEditFeatures, created.name, true)
        setNewEditFeature('')
      } else {
        toggleFeature(createFeatures, setCreateFeatures, created.name, true)
        setNewCreateFeature('')
      }
    } catch (err) {
      setAddFeatureError(extractErrorMessage(err, 'Failed to add feature — it may already exist.'))
    } finally {
      setAddingFeature(false)
    }
  }

  // Removes a feature from the catalog entirely (not just this plan) — the
  // catalog-wide equivalent of what the old separate Features page did.
  async function removeCatalogFeature(id: string) {
    try {
      await deleteFeatureCatalogItem(id)
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
    } catch (err) {
      setAddFeatureError(extractErrorMessage(err, 'Failed to remove feature.'))
    }
  }


  // Union of every feature name across all real plans, for the comparison table below.
  const allFeatureNames = useMemo(() => {
    const names = new Set<string>()
    plans.forEach((p) => p.features.forEach((f) => names.add(f.name)))
    return Array.from(names)
  }, [plans])

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
        {isError && (
          <motion.div
            variants={item}
            className="flex items-start gap-2 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load plans. Please try again.
          </motion.div>
        )}

        {isLoading ? (
          <motion.div variants={item} className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" />
          </motion.div>
        ) : (
        <>
        {/* Plan cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const key = plan.name.toLowerCase()
            const features = plan.features
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
                      <span className="text-3xl font-bold text-[var(--foreground)]">{formatCurrency(plan.price_annual)}</span>
                      <span className="text-sm text-[var(--muted-foreground)]">/student/year</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      &asymp; {formatCurrency(plan.price_monthly)}/student/month &middot; no extra charges
                    </p>
                    {/* Example total badge */}
                    <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold mt-2 w-fit ${PLAN_COLOR[key] ?? 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                      <Users size={11} />
                      e.g. {formatCurrency(plan.price_annual * exampleStudentCount(plan.max_students))}/yr for {formatNumber(exampleStudentCount(plan.max_students))} students
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
                      {features.length === 0 ? (
                        <li className="text-sm text-[var(--muted-foreground)] italic">No features configured yet.</li>
                      ) : (
                        features.map((feat) => (
                          <li key={feat.name} className="flex items-start justify-between gap-2 text-sm">
                            <span className="flex items-start gap-2 text-[var(--foreground)]">
                              <Check size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
                              {feat.name}
                            </span>
                            {feat.price > 0 && (
                              <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">+{formatCurrency(feat.price)}</span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={plan.is_popular ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil size={14} /> Edit Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0 text-red-500 hover:text-red-600 hover:border-red-300"
                        onClick={() => setDeleteTarget(plan)}
                        title="Delete plan"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
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
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Rate / student / yr</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2 pr-6">Total / mo</th>
                        <th className="text-left font-semibold text-[var(--muted-foreground)] pb-2">Total / yr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcResults.map(({ plan, monthly, annual, n }) => {
                        const key = plan.name.toLowerCase()
                        return (
                          <tr key={plan.id} className={plan.is_popular ? 'font-semibold' : ''}>
                            <td className="py-2 pr-6">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_COLOR[key] ?? ''}`}>
                                {plan.is_popular && <Sparkles size={10} />}
                                {plan.label}
                              </span>
                            </td>
                            <td className="py-2 pr-6 text-[var(--muted-foreground)] tabular-nums">
                              {n} × {formatCurrency(plan.price_annual)}
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

        {/* Feature comparison table — built from each plan's real features */}
        {allFeatureNames.length > 0 && (
          <motion.div variants={item}>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader>
                <h3 className="text-base font-semibold text-[var(--foreground)]">Feature Comparison</h3>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-1/3">Feature</TableHead>
                      {plans.map((p) => (
                        <TableHead key={p.id} className="text-center">{p.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFeatureNames.map((name) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium text-[var(--foreground)]">{name}</TableCell>
                        {plans.map((p) => (
                          <TableCell key={p.id} className="text-center">
                            <CheckCell on={p.features.some((f) => f.name === name)} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </>
        )}
      </motion.div>

      {/* Edit Plan Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {activePlan?.label} Plan</DialogTitle>
            <DialogDescription>Flat per-student/year rate, no base fee or extra charges.</DialogDescription>
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
                      onChange={(e) => setEditForm((f) => ({ ...f, max_students: Number(e.target.value) }))}
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

            {/* STEP 2 — Flat per-student rate, no base fee */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Pricing — no extra charges
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-annual">Price Per Student / Year (USD)</Label>
                  <Input
                    id="plan-annual"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.price_annual}
                    onChange={(e) => {
                      const annual = Number(e.target.value)
                      setEditForm((f) => ({ ...f, price_annual: annual, price_monthly: Math.round((annual / 12) * 100) / 100 }))
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="plan-monthly">Per Student / Month (USD)</Label>
                    <span className="text-[10px] text-[var(--primary)] font-semibold bg-[var(--primary)]/10 rounded px-1.5 py-0.5">auto</span>
                  </div>
                  <Input id="plan-monthly" type="number" min={0} value={editForm.price_monthly} disabled />
                </div>
              </div>
            </div>

            {/* Example calculation preview */}
            {editCalc && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  <Calculator size={14} />
                  Example at {editCalc.n.toLocaleString()} students
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <span className="text-[var(--muted-foreground)]">Students × rate</span>
                  <span className="tabular-nums font-medium text-[var(--foreground)]">
                    {editCalc.n.toLocaleString()} × {formatCurrency(editCalc.rate)}
                  </span>
                  <span className="font-bold text-[var(--foreground)]">Total annual</span>
                  <span className="tabular-nums font-bold text-[var(--primary)] text-base">{formatCurrency(editCalc.annual)}</span>
                  <span className="font-bold text-[var(--foreground)]">Total monthly</span>
                  <span className="tabular-nums font-bold text-green-600 text-base">{formatCurrency(editCalc.monthly)}</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <span className="text-xs text-[var(--muted-foreground)]">Bundled at no extra cost — toggle what's included in this plan</span>
              </div>
              {featureCatalog.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] italic">No features yet — add the first one below.</p>
              ) : (
                <div className="space-y-2">
                  {featureCatalog.map((cat) => {
                    const enabled = editFeatures.some((f) => f.name === cat.name)
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${enabled ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}
                      >
                        <Switch checked={enabled} onCheckedChange={(v) => toggleFeature(editFeatures, setEditFeatures, cat.name, v)} />
                        <p className="text-sm text-[var(--foreground)] flex-1 truncate">{cat.name}</p>
                        <button
                          type="button"
                          title="Remove from catalog"
                          className="text-[var(--muted-foreground)] hover:text-red-500 flex-shrink-0"
                          onClick={() => removeCatalogFeature(cat.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a new feature…"
                  value={newEditFeature}
                  onChange={(e) => setNewEditFeature(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewFeature('edit') } }}
                />
                <Button type="button" size="icon" variant="outline" disabled={!newEditFeature.trim() || addingFeature} onClick={() => addNewFeature('edit')}>
                  <Plus size={14} />
                </Button>
              </div>
              {addFeatureError && <p className="text-xs text-red-500">{addFeatureError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editForm.label.trim()} loading={updateMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>Flat per-student/year rate, no base fee or extra charges.</DialogDescription>
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
                      onChange={(e) => setCreateForm((f) => ({ ...f, max_students: e.target.value }))}
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

            {/* STEP 2 — Flat per-student rate, no base fee */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Pricing — no extra charges
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-plan-annual">Price Per Student / Year (USD)</Label>
                  <Input
                    id="new-plan-annual"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={createForm.price_annual}
                    onChange={(e) => {
                      const annual = e.target.value
                      const monthly = annual ? String(Math.round((Number(annual) / 12) * 100) / 100) : ''
                      setCreateForm((f) => ({ ...f, price_annual: annual, price_monthly: monthly }))
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-plan-monthly">Per Student / Month (USD)</Label>
                    <span className="text-[10px] text-[var(--primary)] font-semibold bg-[var(--primary)]/10 rounded px-1.5 py-0.5">auto</span>
                  </div>
                  <Input id="new-plan-monthly" type="number" placeholder="0" value={createForm.price_monthly} disabled />
                </div>
              </div>
            </div>

            {/* Example calculation preview */}
            {createCalc && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  <Calculator size={14} />
                  Example at {createCalc.n.toLocaleString()} students
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <span className="text-[var(--muted-foreground)]">Students × rate</span>
                  <span className="tabular-nums font-medium text-[var(--foreground)]">
                    {createCalc.n.toLocaleString()} × {formatCurrency(createCalc.rate)}
                  </span>
                  <span className="font-bold text-[var(--foreground)]">Total annual</span>
                  <span className="tabular-nums font-bold text-[var(--primary)] text-base">{formatCurrency(createCalc.annual)}</span>
                  <span className="font-bold text-[var(--foreground)]">Total monthly</span>
                  <span className="tabular-nums font-bold text-green-600 text-base">{formatCurrency(createCalc.monthly)}</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <span className="text-xs text-[var(--muted-foreground)]">Bundled at no extra cost — toggle what's included in this plan</span>
              </div>
              {featureCatalog.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] italic">No features yet — add the first one below.</p>
              ) : (
                <div className="space-y-2">
                  {featureCatalog.map((cat) => {
                    const enabled = createFeatures.some((f) => f.name === cat.name)
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${enabled ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}
                      >
                        <Switch checked={enabled} onCheckedChange={(v) => toggleFeature(createFeatures, setCreateFeatures, cat.name, v)} />
                        <p className="text-sm text-[var(--foreground)] flex-1 truncate">{cat.name}</p>
                        <button
                          type="button"
                          title="Remove from catalog"
                          className="text-[var(--muted-foreground)] hover:text-red-500 flex-shrink-0"
                          onClick={() => removeCatalogFeature(cat.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a new feature…"
                  value={newCreateFeature}
                  onChange={(e) => setNewCreateFeature(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewFeature('create') } }}
                />
                <Button type="button" size="icon" variant="outline" disabled={!newCreateFeature.trim() || addingFeature} onClick={() => addNewFeature('create')}>
                  <Plus size={14} />
                </Button>
              </div>
              {addFeatureError && <p className="text-xs text-red-500">{addFeatureError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveCreate} disabled={!createForm.label.trim()} loading={createMutation.isPending}><Plus size={14} /> Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.label} Plan</DialogTitle>
            <DialogDescription>
              This can't be undone. Any school currently subscribed to this plan will need to be moved to a different plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
            >
              <Trash2 size={14} /> Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
