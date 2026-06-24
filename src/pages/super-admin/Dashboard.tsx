import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  School, CreditCard, TrendingUp, Users, Bus, AlertCircle,
  CheckCircle, Clock, DollarSign, UserCheck, ArrowRight,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { mockRevenueData } from '@/lib/mockData'
import { DashboardDrilldown, type DrillMetric } from '@/components/shared/DashboardDrilldown'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PIE_COLORS = ['#9ca3af', '#3b82f6', '#8b5cf6']
const PLAN_DISTRIBUTION = [
  { name: 'Basic', value: 15 },
  { name: 'Standard', value: 42 },
  { name: 'Premium', value: 30 },
]

const ACTIVITY_FEED = [
  { id: 1, icon: School, color: 'text-blue-600 bg-blue-50', description: 'New school registered: Sunrise Academy', school: 'Sunrise Academy', time: '2026-06-23T08:15:00Z' },
  { id: 2, icon: DollarSign, color: 'text-green-600 bg-green-50', description: 'Payment received: $199 from Al-Noor School', school: 'Al-Noor International School', time: '2026-06-23T07:45:00Z' },
  { id: 3, icon: AlertCircle, color: 'text-orange-600 bg-orange-50', description: 'Support ticket opened by Green Valley', school: 'Green Valley School', time: '2026-06-23T07:20:00Z' },
  { id: 4, icon: CheckCircle, color: 'text-green-600 bg-green-50', description: 'Subscription renewed: Pioneer Institute', school: 'Pioneer Institute', time: '2026-06-22T16:30:00Z' },
  { id: 5, icon: UserCheck, color: 'text-purple-600 bg-purple-50', description: 'New admin onboarded: Bright Minds Institute', school: 'Bright Minds Institute', time: '2026-06-22T14:10:00Z' },
  { id: 6, icon: CreditCard, color: 'text-blue-600 bg-blue-50', description: 'Plan upgraded: Star Int. Academy → Premium', school: 'Star International Academy', time: '2026-06-22T11:00:00Z' },
]

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

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Stats Row — click any card to open a filtered detail view */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard title="Total Schools" value="99" change={12} icon={School} color="primary" onClick={() => setDrill('schools')} />
          <StatsCard title="Active Subscriptions" value="87" change={8} icon={CreditCard} color="success" onClick={() => setDrill('active')} />
          <StatsCard title="Expired Subscriptions" value="8" change={-3} icon={AlertCircle} color="danger" onClick={() => setDrill('expired')} />
          <StatsCard title="Total Revenue" value={formatCurrency(186400)} change={15} icon={DollarSign} color="info" onClick={() => setDrill('revenue')} />
          <StatsCard title="Total Students" value="24,580" change={22} icon={Users} color="primary" onClick={() => setDrill('students')} />
          <StatsCard title="Total Drivers" value="420" change={18} icon={Bus} color="warning" onClick={() => setDrill('drivers')} />
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
                <BarChart data={mockRevenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    data={PLAN_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {PLAN_DISTRIBUTION.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} schools`, '']} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-[var(--foreground)]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {PLAN_DISTRIBUTION.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
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
              <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
                {ACTIVITY_FEED.map((a) => {
                  const Icon = a.icon
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-6 py-3 hover:bg-[var(--muted)]/40 transition-colors">
                      <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${a.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--foreground)] leading-snug">{a.description}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(a.time, 'relative')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
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
                    <Badge variant="warning" className="text-sm px-2.5 py-1 font-bold">2</Badge>
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
                    <Badge className="text-sm px-2.5 py-1 font-bold bg-orange-100 text-orange-700 border-0">4</Badge>
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
                    <Badge variant="info" className="text-sm px-2.5 py-1 font-bold">3</Badge>
                    <ArrowRight size={14} className="text-[var(--muted-foreground)]" />
                  </div>
                </div>
              </Card>
            </Link>

            {/* Revenue summary */}
            <Card className="p-4 bg-[var(--primary)]/5 border-[var(--primary)]/20">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">This Month</p>
              <p className="text-2xl font-bold text-[var(--primary)] mt-1">{formatCurrency(19800)}</p>
              <p className="text-xs text-green-600 mt-1">+5.3% from last month</p>
            </Card>
          </div>
        </motion.div>
      </motion.div>

      <DashboardDrilldown metric={drill} onClose={() => setDrill(null)} />
    </Layout>
  )
}
