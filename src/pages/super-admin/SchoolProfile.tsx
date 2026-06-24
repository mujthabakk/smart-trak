import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pencil, Power, Mail, Phone, MapPin, Globe, Calendar, User,
  GraduationCap, Bus, UserCheck, Route as RouteIcon, CreditCard,
  CheckCircle2, Building2, Receipt, TrendingUp,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getInitials, formatDate, formatCurrency, formatNumber } from '@/lib/utils'
import { mockSchools, mockPlans, allSubscriptions } from '@/lib/mockData'
import { PLAN_FEATURES } from '@/lib/constants'
import type { Subscription } from '@/types'

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

export default function SchoolProfile() {
  const navigate = useNavigate()
  const { id } = useParams()

  const school = useMemo(
    () => mockSchools.find((s) => s.id === id) ?? mockSchools[0],
    [id],
  )

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
            <Button onClick={() => navigate(`/super-admin/schools/add`)}>
              <Pencil size={15} /> Edit
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Profile header */}
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
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Organization Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <InfoRow icon={Building2} label="School Name" value={school.name} />
                  <InfoRow icon={Globe} label="Subdomain" value={`${school.subdomain}.smarttrack.app`} />
                  <InfoRow icon={MapPin} label="Address" value={school.address} />
                  <InfoRow icon={MapPin} label="City / State" value={`${school.city}, ${school.state}`} />
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

            {/* Subscription */}
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

            {/* Usage */}
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
                  <p className="text-xs text-[var(--muted-foreground)] pt-1">
                    Usage figures are aggregated from this school's live fleet and enrolment data.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  )
}
