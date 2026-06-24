import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Download, DollarSign, TrendingUp, School as SchoolIcon, Users, CreditCard, Bus,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatNumber, formatDate, downloadCSV } from '@/lib/utils'
import { mockSchools, mockRevenueData, mockSubscriptions } from '@/lib/mockData'
import type { School, Subscription } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PLAN_VARIANT: Record<string, 'muted' | 'info' | 'secondary'> = {
  basic: 'muted',
  standard: 'info',
  premium: 'secondary',
}

const PIE_COLORS = ['#16a34a', '#ef4444', '#f97316', '#a855f7']

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | string; name?: string; dataKey?: string; color?: string }>
  label?: string
  currency?: boolean
}

function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md text-sm">
        {label && <p className="font-medium text-[var(--foreground)] mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="text-[var(--muted-foreground)] capitalize">
            {p.name ?? p.dataKey}:{' '}
            <span className="font-semibold text-[var(--foreground)]">
              {currency ? formatCurrency(Number(p.value)) : String(p.value)}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const PRESETS = ['This Month', 'Last Month', 'Last 3 Months', 'This Year'] as const

export default function SuperAdminReports() {
  const [startDate, setStartDate] = useState('2026-06-01')
  const [endDate, setEndDate] = useState('2026-06-23')
  const [preset, setPreset] = useState<string>('This Month')

  // ─── Revenue derivations ──────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => mockRevenueData.reduce((sum, m) => sum + m.revenue, 0),
    [],
  )
  const momGrowth = useMemo(() => {
    const last = mockRevenueData[mockRevenueData.length - 1]?.revenue ?? 0
    const prev = mockRevenueData[mockRevenueData.length - 2]?.revenue ?? 0
    if (!prev) return 0
    return Math.round(((last - prev) / prev) * 1000) / 10
  }, [])

  // Revenue by top schools (derive an estimate from plan price + student scale)
  const PLAN_PRICE: Record<string, number> = { Premium: 1910, Standard: 950, Basic: 470 }
  const topSchools = useMemo(
    () =>
      [...mockSchools]
        .map((s) => ({
          name: s.name.length > 16 ? `${s.name.slice(0, 16)}…` : s.name,
          revenue: (PLAN_PRICE[s.plan_name] ?? 470) + Math.round(s.student_count * 1.5),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
    [],
  )

  // ─── Subscription derivations ─────────────────────────────────────────
  const subStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    mockSubscriptions.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [])

  // ─── Overview ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const students = mockSchools.reduce((s, x) => s + x.student_count, 0)
    const buses = mockSchools.reduce((s, x) => s + x.bus_count, 0)
    const drivers = mockSchools.reduce((s, x) => s + x.driver_count, 0)
    const active = mockSchools.filter((s) => s.status === 'active').length
    return { students, buses, drivers, active }
  }, [])

  function exportCSV() {
    const rows = mockSchools.map((s) => ({
      school: s.name,
      city: s.city,
      plan: s.plan_name,
      status: s.status,
      students: s.student_count,
      drivers: s.driver_count,
      buses: s.bus_count,
      routes: s.route_count,
    }))
    downloadCSV(rows, 'platform-report')
  }

  function applyPreset(p: string) {
    setPreset(p)
    const now = new Date('2026-06-23')
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    if (p === 'This Month') {
      setStartDate(fmt(new Date(now.getFullYear(), now.getMonth(), 1)))
      setEndDate(fmt(now))
    } else if (p === 'Last Month') {
      setStartDate(fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      setEndDate(fmt(new Date(now.getFullYear(), now.getMonth(), 0)))
    } else if (p === 'Last 3 Months') {
      setStartDate(fmt(new Date(now.getFullYear(), now.getMonth() - 3, 1)))
      setEndDate(fmt(now))
    } else if (p === 'This Year') {
      setStartDate(fmt(new Date(now.getFullYear(), 0, 1)))
      setEndDate(fmt(now))
    }
  }

  // ─── Columns ──────────────────────────────────────────────────────────
  const activityColumns: Column<School>[] = [
    {
      key: 'name',
      header: 'School',
      sortable: true,
      accessor: (row) => row.name,
      render: (row) => <span className="font-medium text-[var(--foreground)] truncate">{row.name}</span>,
    },
    {
      key: 'student_count',
      header: 'Students',
      sortable: true,
      accessor: (row) => row.student_count,
      render: (row) => <span className="text-[var(--foreground)] tabular-nums">{formatNumber(row.student_count)}</span>,
    },
    {
      key: 'driver_count',
      header: 'Drivers',
      sortable: true,
      accessor: (row) => row.driver_count,
      render: (row) => <span className="text-[var(--foreground)] tabular-nums">{row.driver_count}</span>,
    },
    {
      key: 'bus_count',
      header: 'Buses',
      sortable: true,
      accessor: (row) => row.bus_count,
      render: (row) => <span className="text-[var(--foreground)] tabular-nums">{row.bus_count}</span>,
    },
    {
      key: 'route_count',
      header: 'Routes',
      sortable: true,
      accessor: (row) => row.route_count,
      render: (row) => <span className="text-[var(--foreground)] tabular-nums">{row.route_count}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  const subColumns: Column<Subscription>[] = [
    {
      key: 'school_name',
      header: 'School',
      sortable: true,
      accessor: (row) => row.school_name,
      render: (row) => <span className="font-medium text-[var(--foreground)] truncate">{row.school_name}</span>,
    },
    {
      key: 'plan_name',
      header: 'Plan',
      sortable: true,
      accessor: (row) => row.plan_name,
      render: (row) => <Badge variant={PLAN_VARIANT[row.plan_name.toLowerCase()] ?? 'muted'}>{row.plan_name}</Badge>,
    },
    {
      key: 'amount_paid',
      header: 'Amount',
      sortable: true,
      accessor: (row) => row.amount_paid,
      render: (row) => <span className="font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(row.amount_paid)}</span>,
    },
    {
      key: 'end_date',
      header: 'Renews',
      sortable: true,
      accessor: (row) => row.end_date,
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.end_date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <Layout>
      <PageHeader
        title="Platform Reports"
        subtitle="Revenue, activity and subscription analytics"
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Date range */}
        <motion.div variants={item}>
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">From</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">To</Label>
                  <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    variant={preset === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="revenue">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="activity">School Activity</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* Revenue */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatsCard title="Total Revenue" value={formatCurrency(totalRevenue)} change={15} icon={DollarSign} color="success" />
                <StatsCard title="MoM Growth" value={`${momGrowth}%`} change={momGrowth} icon={TrendingUp} color="info" subtitle="Month over month" />
              </div>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <SchoolIcon size={18} className="text-[var(--primary)]" /> Revenue by Top Schools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topSchools} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                      <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} content={<ChartTooltip currency />} />
                      <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-[var(--primary)]" /> Monthly Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={mockRevenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTooltip currency />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl overflow-hidden">
                <CardHeader><CardTitle>Monthly Breakdown</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Active Schools</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...mockRevenueData].reverse().slice(0, 6).map((m) => (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium text-[var(--foreground)]">{m.month}</TableCell>
                          <TableCell className="text-right tabular-nums text-[var(--foreground)]">{formatCurrency(m.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">{m.schools}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* School Activity */}
            <TabsContent value="activity" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Students" value={formatNumber(totals.students)} icon={Users} color="primary" />
                <StatsCard title="Total Buses" value={totals.buses} icon={Bus} color="info" />
                <StatsCard title="Total Drivers" value={totals.drivers} icon={Users} color="warning" />
                <StatsCard title="Active Schools" value={totals.active} icon={SchoolIcon} color="success" />
              </div>
              <DataTable
                columns={activityColumns}
                data={mockSchools}
                keyField="id"
                searchable
                searchKeys={['name', 'city']}
                searchPlaceholder="Search schools…"
                emptyTitle="No activity"
                emptyDescription="No school activity records to show."
              />
            </TabsContent>

            {/* Subscriptions */}
            <TabsContent value="subscriptions" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="rounded-2xl lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[var(--primary)]" /> Status Split
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={subStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {subStatusData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          formatter={(value) => <span className="text-xs text-[var(--muted-foreground)] capitalize">{String(value)}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <DataTable
                    columns={subColumns}
                    data={mockSubscriptions}
                    keyField="id"
                    searchable
                    searchKeys={['school_name', 'plan_name']}
                    searchPlaceholder="Search subscriptions…"
                    emptyTitle="No subscriptions"
                    emptyDescription="No subscription records to show."
                  />
                </div>
              </div>
            </TabsContent>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Revenue" value={formatCurrency(totalRevenue)} change={15} icon={DollarSign} color="success" />
                <StatsCard title="Total Schools" value={mockSchools.length} icon={SchoolIcon} color="primary" />
                <StatsCard title="Total Students" value={formatNumber(totals.students)} icon={Users} color="info" />
                <StatsCard title="Active Subs" value={mockSubscriptions.filter((s) => s.status === 'active').length} icon={CreditCard} color="warning" />
              </div>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <SchoolIcon size={18} className="text-[var(--primary)]" /> School Growth (Last 12 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={mockRevenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="schoolsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="schools" stroke="var(--primary)" strokeWidth={2} fill="url(#schoolsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
