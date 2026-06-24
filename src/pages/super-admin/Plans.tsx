import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Check, X, Pencil, Sparkles, Users, Bus, UserCheck,
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
  label: '', price_monthly: 0, price_annual: 0,
  max_students: 0, max_buses: 0, max_drivers: 0,
}
const EMPTY_CREATE_FORM = {
  label: '', price_monthly: '', price_annual: '',
  max_students: '', max_buses: '', max_drivers: '',
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
                      <span className="text-sm text-[var(--muted-foreground)]">/month</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      or {formatCurrency(plan.price_annual)} billed annually
                    </p>
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
            <DialogDescription>Update pricing, limits and feature access.</DialogDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-monthly">Monthly Price (USD)</Label>
                <Input
                  id="plan-monthly"
                  type="number"
                  value={editForm.price_monthly}
                  onChange={(e) => setEditForm((f) => ({ ...f, price_monthly: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-annual">Annual Price (USD)</Label>
                <Input
                  id="plan-annual"
                  type="number"
                  value={editForm.price_annual}
                  onChange={(e) => setEditForm((f) => ({ ...f, price_annual: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-students">Max Students</Label>
                <Input
                  id="plan-students"
                  type="number"
                  value={editForm.max_students}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_students: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-buses">Max Buses</Label>
                <Input
                  id="plan-buses"
                  type="number"
                  value={editForm.max_buses}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_buses: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-drivers">Max Drivers</Label>
                <Input
                  id="plan-drivers"
                  type="number"
                  value={editForm.max_drivers}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_drivers: Number(e.target.value) }))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <span className="text-sm text-[var(--foreground)]">{feat}</span>
                    <Switch
                      checked={editToggles[feat] ?? false}
                      onCheckedChange={(v) => setEditToggles((prev) => ({ ...prev, [feat]: v }))}
                    />
                  </div>
                ))}
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
            <DialogDescription>Define a new subscription tier with pricing, limits and features.</DialogDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-monthly">Monthly Price (USD)</Label>
                <Input
                  id="new-plan-monthly"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={createForm.price_monthly}
                  onChange={(e) => setCreateForm((f) => ({ ...f, price_monthly: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-annual">Annual Price (USD)</Label>
                <Input
                  id="new-plan-annual"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={createForm.price_annual}
                  onChange={(e) => setCreateForm((f) => ({ ...f, price_annual: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-students">Max Students</Label>
                <Input
                  id="new-plan-students"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={createForm.max_students}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_students: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-buses">Max Buses</Label>
                <Input
                  id="new-plan-buses"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={createForm.max_buses}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_buses: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-plan-drivers">Max Drivers</Label>
                <Input
                  id="new-plan-drivers"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={createForm.max_drivers}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_drivers: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <span className="text-sm text-[var(--foreground)]">{feat}</span>
                    <Switch
                      checked={createToggles[feat] ?? false}
                      onCheckedChange={(v) => setCreateToggles((prev) => ({ ...prev, [feat]: v }))}
                    />
                  </div>
                ))}
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
