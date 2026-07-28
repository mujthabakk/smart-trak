import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  School, CreditCard, TrendingUp, Users, Bus, AlertCircle,
  Clock, DollarSign, UserCheck, ArrowRight,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatsCard } from '@/components/shared/StatsCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import { listSchools } from '@/lib/api/schools'
import { listSubscriptions } from '@/lib/api/subscriptions'
import { getRevenueReport } from '@/lib/api/reports'
import { listTickets } from '@/lib/api/tickets'
import { listAuditLogs, type AuditLog } from '@/lib/api/auditLogs'
import { DashboardDrilldown, type DrillMetric } from '@/components/shared/DashboardDrilldown'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PIE_COLORS = ['#9ca3af', '#3b82f6', '#8b5cf6', '#f59e0b']

// Icon/color per audit-log entity type — falls back to a generic clock icon
// for any entity_type the platform hasn't recorded a mapping for yet.
const ENTITY_ICON: Record<string, { icon: typeof School; color: string }> = {
  school: { icon: School, color: 'text-blue-600 bg-blue-50' },
  subscription: { icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  payment: { icon: DollarSign, color: 'text-green-600 bg-green-50' },
  plan: { icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  ticket: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
  user: { icon: UserCheck, color: 'text-purple-600 bg-purple-50' },
}
const DEFAULT_ENTITY_ICON = { icon: Clock, color: 'text-slate-600 bg-slate-100' }

const ACTION_VERB: Record<string, string> = {
  create: 'created', update: 'updated', delete: 'deleted', approve: 'approved', payment: 'recorded a payment for',
}

function describeAuditLog(log: AuditLog): string {
  const actor = log.user_name ?? 'System'
  const [, verbRaw] = log.action.split('.')
  const verb = ACTION_VERB[verbRaw ?? ''] ?? log.action.replace(/[._]/g, ' ')
  const target = log.school_name ? ` ${log.entity_type} for ${log.school_name}` : ` ${log.entity_type}`
  return `${actor} ${verb}${target}`
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md text-sm">
        <p className="font-medium text-[var(--foreground)] mb-1">{label}</p>
        <p className="text-[var(--muted-foreground)]">Revenue: <span className="font-semibold text-[var(--foreground)]">{formatCurrency(payload[0].value)}</span></p>
      </div>
    )
  }
  return null
}

export default function SuperAdminDashboard() {
  const [_activeIndex, setActiveIndex] = useState<number | null>(null)
  const [drill, setDrill] = useState<DrillMetric | null>(null)

  const schoolsQuery = useQuery({
    queryKey: ['schools', { pageSize: 1000 }],
    queryFn: () => listSchools({ pageSize: 1000 }),
  })
  const schools = useMemo(() => schoolsQuery.data?.schools ?? [], [schoolsQuery.data])

  const subscriptionsQuery = useQuery({
    queryKey: ['subscriptions', { pageSize: 1000 }],
    queryFn: () => listSubscriptions({ pageSize: 1000 }),
  })
  const subscriptions = useMemo(() => subscriptionsQuery.data?.subscriptions ?? [], [subscriptionsQuery.data])

  const revenueQuery = useQuery({
    queryKey: ['reports', 'revenue'],
    queryFn: getRevenueReport,
  })
  const revenueData = revenueQuery.data ?? []

  const openTicketsQuery = useQuery({
    queryKey: ['tickets', { status: 'open', pageSize: 1 }],
    queryFn: () => listTickets({ status: 'open', pageSize: 1 }),
  })

  const activityQuery = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => listAuditLogs({ pageSize: 6 }),
  })
  const activityLogs = activityQuery.data?.logs ?? []

  const statsLoading = schoolsQuery.isLoading || subscriptionsQuery.isLoading || revenueQuery.isLoading

  const totals = useMemo(() => ({
    schools: schools.length,
    students: schools.reduce((sum, s) => sum + s.student_count, 0),
    drivers: schools.reduce((sum, s) => sum + s.driver_count, 0),
    activeSubs: subscriptions.filter((s) => s.status === 'active').length,
    expiredSubs: subscriptions.filter((s) => s.status === 'suspended' || s.status === 'expired').length,
    pendingSchools: schools.filter((s) => s.status === 'pending').length,
  }), [schools, subscriptions])

  const totalRevenue = useMemo(() => revenueData.reduce((sum, m) => sum + m.revenue, 0), [revenueData])
  const currentMonthRevenue = revenueData[revenueData.length - 1]?.revenue ?? 0
  const revenueMoMChange = useMemo(() => {
    const last = revenueData[revenueData.length - 1]?.revenue ?? 0
    const prev = revenueData[revenueData.length - 2]?.revenue ?? 0
    if (!prev) return 0
    return Math.round(((last - prev) / prev) * 1000) / 10
  }, [revenueData])

  const expiringSubsCount = useMemo(
    () => subscriptions.filter((s) => { const d = daysUntil(s.end_date); return d >= 0 && d <= 7 }).length,
    [subscriptions],
  )
  const openTicketsCount = openTicketsQuery.data?.pagination.total ?? 0

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    schools.forEach((s) => { counts[s.plan_name] = (counts[s.plan_name] ?? 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [schools])

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Stats Row — click any card to open a filtered detail view */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard title="Total Schools" value={totals.schools} loading={statsLoading} icon={School} color="primary" onClick={() => setDrill('schools')} />
          <StatsCard title="Active Subscriptions" value={totals.activeSubs} loading={statsLoading} icon={CreditCard} color="success" onClick={() => setDrill('active')} />
          <StatsCard title="Expired Subscriptions" value={totals.expiredSubs} loading={statsLoading} icon={AlertCircle} color="danger" onClick={() => setDrill('expired')} />
          <StatsCard title="Total Revenue" value={formatCurrency(totalRevenue)} change={revenueMoMChange} loading={statsLoading} icon={DollarSign} color="info" onClick={() => setDrill('revenue')} />
          <StatsCard title="Total Students" value={totals.students.toLocaleString()} loading={statsLoading} icon={Users} color="primary" onClick={() => setDrill('students')} />
          <StatsCard title="Total Drivers" value={totals.drivers} loading={statsLoading} icon={Bus} color="warning" onClick={() => setDrill('drivers')} />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--primary)]" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <School size={18} className="text-[var(--primary)]" />
                Schools by Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} schools`, '']} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-[var(--foreground)]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {planDistribution.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[var(--muted-foreground)]">{d.name}</span>
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Row: Activity Feed + Quick Actions */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Clock size={18} className="text-[var(--primary)]" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activityQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[var(--muted-foreground)] text-center">No recent activity to show.</p>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
                  {activityLogs.map((a) => {
                    const { icon: Icon, color } = ENTITY_ICON[a.entity_type] ?? DEFAULT_ENTITY_ICON
                    return (
                      <div key={a.id} className="flex items-start gap-3 px-6 py-3 hover:bg-[var(--muted)]/40 transition-colors">
                        <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--foreground)] leading-snug">{describeAuditLog(a)}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(a.created_at, 'relative')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-1">Quick Actions</h3>

            <Link to="/super-admin/schools?status=pending" className="block">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-yellow-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Pending Approvals</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Schools awaiting review</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="text-sm px-2.5 py-1 font-bold">{totals.pendingSchools}</Badge>
                    <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/super-admin/subscriptions" className="block">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Expiring Subscriptions</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Expiring within 7 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-sm px-2.5 py-1 font-bold bg-orange-100 text-orange-700 border-0">{expiringSubsCount}</Badge>
                    <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/super-admin/support" className="block">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Open Tickets</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Awaiting response</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="text-sm px-2.5 py-1 font-bold">{openTicketsCount}</Badge>
                    <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                  </div>
                </div>
              </Card>
            </Link>

            {/* Revenue summary */}
            <Card className="p-4 bg-[var(--primary)]/5 border-[var(--primary)]/20">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">This Month</p>
              <p className="text-2xl font-bold text-[var(--primary)] mt-1">{formatCurrency(currentMonthRevenue)}</p>
              <p className={`text-xs mt-1 ${revenueMoMChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueMoMChange >= 0 ? '+' : ''}{revenueMoMChange}% from last month
              </p>
            </Card>
          </div>
        </motion.div>
      </motion.div>

      <DashboardDrilldown metric={drill} onClose={() => setDrill(null)} />
    </Layout>
  )
}
