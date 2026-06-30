import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pencil, Power, Mail, Phone, MapPin, Globe, Calendar, User,
  GraduationCap, Bus, UserCheck, Route as RouteIcon, CreditCard,
  CheckCircle2, Building2, Receipt, TrendingUp, Save, ArrowLeft,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getInitials, formatDate, formatCurrency, formatNumber } from '@/lib/utils'
import { mockSchools, mockPlans, allSubscriptions } from '@/lib/mockData'
import { PLAN_FEATURES } from '@/lib/constants'
import type { School, Subscription } from '@/types'

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PLAN_VARIANT: Record<string, 'muted' | 'info' | 'secondary'> = {
  basic: 'muted',
  standard: 'info',
  premium: 'secondary',
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] flex-shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{value}</p>
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit, icon: Icon }: {
  label: string
  used: number
  limit: number
  icon: typeof GraduationCap
}) {
  const unlimited = limit >= 99999
  const pct = unlimited ? Math.min(100, (used / 1500) * 100) : Math.min(100, Math.round((used / limit) * 100))
  const high = !unlimited && pct >= 85
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <Icon size={15} className="text-[var(--muted-foreground)]" />
          {label}
        </span>
        <span className="text-sm tabular-nums text-[var(--muted-foreground)]">
          {formatNumber(used)} / {unlimited ? '∞' : formatNumber(limit)}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${high ? 'bg-orange-500' : 'bg-[var(--primary)]'}`}
          style={{ width: `${unlimited ? Math.max(8, pct) : pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        {unlimited ? 'Unlimited on this plan' : `${pct}% of plan limit used`}
      </p>
    </div>
  )
}

// ─── Edit form state ──────────────────────────────────────────────────────────
interface EditForm {
  name: string
  admin_name: string
  admin_email: string
  phone: string
  website: string
  plan_name: string
  address: string
  city: string
  state: string
  post_code: string
  country: string
  student_count: string
  bus_count: string
  driver_count: string
}

function schoolToForm(s: School): EditForm {
  return {
    name: s.name,
    admin_name: s.admin_name ?? '',
    admin_email: s.admin_email ?? s.email ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    plan_name: s.plan_name?.toLowerCase() ?? 'standard',
    address: s.address ?? '',
    city: s.city ?? '',
    state: s.state ?? '',
    post_code: s.post_code ?? '',
    country: s.country ?? 'UAE',
    student_count: String(s.student_count ?? ''),
    bus_count: String(s.bus_count ?? ''),
    driver_count: String(s.driver_count ?? ''),
  }
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-3">{children}</p>
  )
}

export default function SchoolProfile() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [schools, setSchools] = useState<School[]>(mockSchools)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const school = useMemo(
    () => schools.find((s) => s.id === id) ?? schools[0],
    [id, schools],
  )

  const [form, setForm] = useState<EditForm>(() => schoolToForm(school))

  const plan = useMemo(
    () => mockPlans.find((p) => p.id === school.plan_id) ?? mockPlans[0],
    [school.plan_id],
  )

  const subscriptions = useMemo(
    () => allSubscriptions.filter((s) => s.school_id === school.id),
    [school.id],
  )
  const currentSub = subscriptions[0]
  const planFeatures = PLAN_FEATURES[plan.name as keyof typeof PLAN_FEATURES] ?? []

  function set(field: keyof EditForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const planLabel = form.plan_name.charAt(0).toUpperCase() + form.plan_name.slice(1)
    setSchools((prev) => prev.map((s) => s.id === school.id ? {
      ...s,
      name: form.name,
      admin_name: form.admin_name || undefined,
      admin_email: form.admin_email,
      email: form.admin_email,
      phone: form.phone,
      website: form.website || undefined,
      plan_name: planLabel,
      address: form.address,
      city: form.city,
      state: form.state,
      post_code: form.post_code || undefined,
      country: form.country,
      student_count: Number(form.student_count) || s.student_count,
      bus_count: Number(form.bus_count) || s.bus_count,
      driver_count: Number(form.driver_count) || s.driver_count,
    } : s))
    setSaved(true)
  }

  const billingColumns: Column<Subscription>[] = [
    {
      key: 'plan_name',
      header: 'Plan',
      render: (s) => (
        <div className="flex items-center gap-2">
          <Receipt size={14} className="text-[var(--muted-foreground)]" />
          <span className="font-medium text-[var(--foreground)]">{s.plan_name}</span>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (s) => (
        <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
          {formatDate(s.start_date)} – {formatDate(s.end_date)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (s) => <span className="text-sm text-[var(--foreground)]">{s.payment_method}</span>,
    },
    {
      key: 'amount_paid',
      header: 'Amount',
      className: 'tabular-nums',
      render: (s) => <span className="font-medium text-[var(--foreground)]">{formatCurrency(s.amount_paid)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.status} size="sm" />,
    },
  ]

  return (
    <Layout>
      <PageHeader
        title={school.name}
        subtitle={`${school.city}, ${school.state} · ${school.subdomain}.smarttrack.app`}
        breadcrumbs={[
          { label: 'Schools', path: '/super-admin/schools' },
          { label: school.name },
        ]}
        actions={
          <>
            <Button variant="outline">
              <Power size={15} />
              {school.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </Button>
            <Button onClick={() => setActiveTab('edit')}>
              <Pencil size={15} /> Edit School
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Profile header card */}
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="overflow-hidden">
            <div className="h-28 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]" />
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <div className="h-24 w-24 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[var(--card)] shadow-lg flex-shrink-0">
                  {getInitials(school.name)}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">{school.name}</h2>
                    <Badge variant={PLAN_VARIANT[plan.name] ?? 'muted'}>{school.plan_name}</Badge>
                    <StatusBadge status={school.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <Mail size={14} /> {school.admin_email ?? school.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone size={14} /> {school.phone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User size={14} /> {school.admin_name ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Students" value={formatNumber(school.student_count)} icon={GraduationCap} color="primary" />
          <StatsCard title="Buses" value={school.bus_count} icon={Bus} color="info" />
          <StatsCard title="Drivers" value={school.driver_count} icon={UserCheck} color="success" />
          <StatsCard title="Routes" value={school.route_count} icon={RouteIcon} color="warning" />
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="edit">Edit School</TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Organization Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <InfoRow icon={Building2} label="School Name" value={school.name} />
                  <InfoRow icon={Globe} label="Subdomain" value={`${school.subdomain}.smarttrack.app`} />
                  <InfoRow icon={MapPin} label="Address" value={school.address} />
                  <InfoRow icon={MapPin} label="City / State" value={`${school.city}, ${school.state}`} />
                  {school.post_code && <InfoRow icon={MapPin} label="Post Code" value={school.post_code} />}
                  {school.country && <InfoRow icon={Globe} label="Country" value={school.country} />}
                  {school.website && <InfoRow icon={Globe} label="Website" value={school.website} />}
                  <InfoRow icon={Phone} label="Phone" value={school.phone} />
                  <InfoRow icon={Calendar} label="Onboarded" value={formatDate(school.created_at)} />
                  <InfoRow icon={CreditCard} label="Plan" value={school.plan_name} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Admin Contacts</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <InfoRow icon={User} label="Administrator" value={school.admin_name ?? '—'} />
                  <InfoRow icon={Mail} label="Admin Email" value={school.admin_email ?? school.email} />
                  <InfoRow icon={Mail} label="School Email" value={school.email} />
                  <InfoRow icon={Phone} label="Phone" value={school.phone} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Subscription ── */}
            <TabsContent value="subscription" className="space-y-6">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/80">Current Plan</p>
                      <p className="text-2xl font-bold mt-0.5">{plan.label}</p>
                      <p className="text-sm text-white/80 mt-1">
                        {formatCurrency(plan.price_monthly)}/mo · {formatCurrency(plan.price_annual)}/yr
                      </p>
                    </div>
                    {currentSub && <StatusBadge status={currentSub.status} />}
                  </div>
                  {currentSub && (
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/20">
                      <div>
                        <p className="text-xs text-white/70">Started</p>
                        <p className="text-sm font-semibold">{formatDate(currentSub.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Renews</p>
                        <p className="text-sm font-semibold">{formatDate(currentSub.end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Last Paid</p>
                        <p className="text-sm font-semibold">{formatCurrency(currentSub.amount_paid)}</p>
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="pt-5">
                  <p className="text-sm font-medium text-[var(--foreground)] mb-3">Plan includes</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {planFeatures.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <CheckCircle2 size={15} className="text-[var(--primary)] flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Billing History</CardTitle></CardHeader>
                <CardContent className="px-0 pb-0">
                  <DataTable
                    columns={billingColumns}
                    data={subscriptions}
                    keyField="id"
                    emptyTitle="No billing history"
                    emptyDescription="This school has no recorded payments yet."
                    className="rounded-none border-0"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Usage ── */}
            <TabsContent value="usage" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Plan Limits Used</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <UsageBar label="Students" used={school.student_count} limit={plan.max_students} icon={GraduationCap} />
                  <UsageBar label="Buses" used={school.bus_count} limit={plan.max_buses} icon={Bus} />
                  <UsageBar label="Drivers" used={school.driver_count} limit={plan.max_drivers} icon={UserCheck} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Activity Snapshot</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <RouteIcon size={16} className="text-[var(--primary)]" /> Active Routes
                    </span>
                    <span className="text-lg font-bold text-[var(--foreground)] tabular-nums">{school.route_count}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <TrendingUp size={16} className="text-green-600" /> Avg. Students / Bus
                    </span>
                    <span className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                      {school.bus_count ? Math.round(school.student_count / school.bus_count) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <UserCheck size={16} className="text-blue-600" /> Buses / Driver
                    </span>
                    <span className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                      {school.driver_count ? (school.bus_count / school.driver_count).toFixed(1) : '0'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Edit School ── */}
            <TabsContent value="edit">
              <form onSubmit={handleSave} className="space-y-6 max-w-3xl">

                {/* School Information */}
                <Card>
                  <CardHeader><CardTitle className="text-base">School Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <SectionLabel>Basic Details</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label htmlFor="e-name">School name *</Label>
                        <Input id="e-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Greenfield Academy" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-phone">Phone number</Label>
                        <Input id="e-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971-4-555-0100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-website">Website</Label>
                        <Input id="e-website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="www.school.ae" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Contact */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Admin Contact</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="e-admin-name">Admin name</Label>
                        <Input id="e-admin-name" value={form.admin_name} onChange={(e) => set('admin_name', e.target.value)} placeholder="Hassan Al-Rashid" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-admin-email">Admin email *</Label>
                        <Input id="e-admin-email" type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} placeholder="admin@school.ae" required />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Details */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Address Details</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label htmlFor="e-address">Street address</Label>
                        <Input id="e-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="45 Sheikh Zayed Road" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-city">City</Label>
                        <Input id="e-city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dubai" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-state">State / Emirate</Label>
                        <Input id="e-state" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Dubai" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-postcode">Post / ZIP code</Label>
                        <Input id="e-postcode" value={form.post_code} onChange={(e) => set('post_code', e.target.value)} placeholder="00000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-country">Country</Label>
                        <Input id="e-country" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="UAE" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan & Capacity */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Plan &amp; Capacity</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Plan</Label>
                        <Select value={form.plan_name} onValueChange={(v) => set('plan_name', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-students">Students</Label>
                        <Input id="e-students" type="number" min={0} value={form.student_count} onChange={(e) => set('student_count', e.target.value)} placeholder="350" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-buses">Buses</Label>
                        <Input id="e-buses" type="number" min={0} value={form.bus_count} onChange={(e) => set('bus_count', e.target.value)} placeholder="8" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="e-drivers">Drivers</Label>
                        <Input id="e-drivers" type="number" min={0} value={form.driver_count} onChange={(e) => set('driver_count', e.target.value)} placeholder="6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => { setForm(schoolToForm(school)); setSaved(false); setActiveTab('overview') }}>
                    <ArrowLeft size={15} /> Cancel
                  </Button>
                  <Button type="submit" className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
                    {saved ? <><CheckCircle2 size={15} /> Saved!</> : <><Save size={15} /> Save Changes</>}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  )
}
