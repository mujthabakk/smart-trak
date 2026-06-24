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

// Feature matrix for the comparison table (basic / standard / premium)
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

const TOGGLE_FEATURES = [
  'WhatsApp Notifications',
  'Training Centre',
  'Bus Transfer',
  'Guest Driver',
  'Advanced Reports',
  'API Access',
]

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

export default function Plans() {
  const [editOpen, setEditOpen] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  function openEdit(plan: Plan) {
    setActivePlan(plan)
    const key = plan.name.toLowerCase()
    setToggles({
      'WhatsApp Notifications': key !== 'basic',
      'Training Centre': key !== 'basic',
      'Bus Transfer': key !== 'basic',
      'Guest Driver': key === 'premium',
      'Advanced Reports': key !== 'basic',
      'API Access': key === 'premium',
    })
    setEditOpen(true)
  }

  const featureLists = useMemo(
    () =>
      mockPlans.map((p) => ({
        id: p.id,
        list: PLAN_FEATURES[p.name as keyof typeof PLAN_FEATURES] ?? p.features,
      })),
    [],
  )

  return (
    <Layout>
      <PageHeader
        title="Subscription Plans"
        subtitle="Configure pricing tiers and feature access"
        actions={
          <Button>
            <Plus size={16} /> Create Plan
          </Button>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Plan cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {mockPlans.map((plan) => {
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {activePlan?.label} Plan</DialogTitle>
            <DialogDescription>Update pricing, limits and feature access.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input id="plan-name" defaultValue={activePlan?.label ?? ''} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-monthly">Monthly Price (USD)</Label>
                <Input id="plan-monthly" type="number" defaultValue={activePlan?.price_monthly ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-annual">Annual Price (USD)</Label>
                <Input id="plan-annual" type="number" defaultValue={activePlan?.price_annual ?? 0} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-students">Max Students</Label>
                <Input id="plan-students" type="number" defaultValue={activePlan?.max_students ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-buses">Max Buses</Label>
                <Input id="plan-buses" type="number" defaultValue={activePlan?.max_buses ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-drivers">Max Drivers</Label>
                <Input id="plan-drivers" type="number" defaultValue={activePlan?.max_drivers ?? 0} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOGGLE_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <span className="text-sm text-[var(--foreground)]">{feat}</span>
                    <Switch
                      checked={toggles[feat] ?? false}
                      onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [feat]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
