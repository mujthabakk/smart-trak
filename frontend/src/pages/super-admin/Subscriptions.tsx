import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard, Receipt, CalendarClock, Filter, X,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import { listSubscriptions, updateSubscription } from '@/lib/api/subscriptions'
import { getRevenueReport } from '@/lib/api/reports'
import { PAYMENT_METHODS } from '@/lib/constants'
import type { Subscription } from '@/types'

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

interface RevenueTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md text-sm">
        <p className="font-medium text-[var(--foreground)] mb-1">{label}</p>
        <p className="text-[var(--muted-foreground)]">
          Revenue: <span className="font-semibold text-[var(--foreground)]">{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    )
  }
  return null
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
}

export default function Subscriptions() {
  const queryClient = useQueryClient()

  const { data: subscriptionsData, isLoading, isError } = useQuery({
    queryKey: ['subscriptions', { pageSize: 1000 }],
    queryFn: () => listSubscriptions({ pageSize: 1000 }),
  })
  const subscriptions = useMemo(() => subscriptionsData?.subscriptions ?? [], [subscriptionsData])

  const { data: revenueData = [] } = useQuery({
    queryKey: ['reports', 'revenue'],
    queryFn: getRevenueReport,
  })

  const [payOpen, setPayOpen] = useState(false)
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS[1])
  const [payAmount, setPayAmount] = useState(0)

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Subscription> }) => updateSubscription(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      setPayOpen(false)
    },
  })

  // Filters
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterSchool, setFilterSchool] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const uniqueSchools = useMemo(
    () => [...new Set(subscriptions.map((s) => s.school_name))].sort(),
    [subscriptions],
  )

  const availableMonths = useMemo(() => {
    const months = new Set(subscriptions.map((s) => s.start_date.slice(0, 7)))
    return [...months].sort()
  }, [subscriptions])

  const uniqueStatuses = useMemo(
    () => [...new Set(subscriptions.map((s) => s.status))].sort(),
    [subscriptions],
  )

  const hasActiveFilters = filterMonth !== 'all' || filterDateFrom || filterDateTo || filterSchool !== 'all' || filterPlan !== 'all' || filterStatus !== 'all'

  function resetFilters() {
    setFilterMonth('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterSchool('all')
    setFilterPlan('all')
    setFilterStatus('all')
  }

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      if (filterMonth !== 'all' && !s.start_date.startsWith(filterMonth)) return false
      if (filterDateFrom && s.start_date < filterDateFrom) return false
      if (filterDateTo && s.start_date > filterDateTo) return false
      if (filterSchool !== 'all' && s.school_name !== filterSchool) return false
      if (filterPlan !== 'all' && s.plan_name.toLowerCase() !== filterPlan) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      return true
    })
  }, [subscriptions, filterMonth, filterDateFrom, filterDateTo, filterSchool, filterPlan, filterStatus])

  const stats = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, m) => sum + m.revenue, 0)
    const monthlyRevenue = revenueData[revenueData.length - 1]?.revenue ?? 0
    const outstanding = subscriptions
      .filter((s) => s.status === 'expired' || s.status === 'suspended')
      .reduce((sum, s) => sum + s.amount_paid, 0)
    const activeCount = subscriptions.filter((s) => s.status === 'active').length
    return { totalRevenue, monthlyRevenue, outstanding, activeCount }
  }, [revenueData, subscriptions])

  const momGrowth = useMemo(() => {
    const last = revenueData[revenueData.length - 1]?.revenue ?? 0
    const prev = revenueData[revenueData.length - 2]?.revenue ?? 0
    if (!prev) return 0
    return Math.round(((last - prev) / prev) * 1000) / 10
  }, [revenueData])

  const expiringSoon = useMemo(() => {
    const withDays = subscriptions.filter((s) => {
      const d = daysUntil(s.end_date)
      return d >= 0 && d <= 7
    })
    return withDays.length > 0 ? withDays : subscriptions.slice(0, 2)
  }, [subscriptions])

  function openPayment(sub: Subscription) {
    setActiveSub(sub)
    setPayMethod(sub.payment_method || PAYMENT_METHODS[1])
    setPayAmount(sub.amount_paid)
    setPayOpen(true)
  }

  const today = new Date().toISOString().slice(0, 10)

  const columns: Column<Subscription>[] = [
    {
      key: 'school_name',
      header: 'School',
      sortable: true,
      accessor: (row) => row.school_name,
      render: (row) => <span className="font-medium text-[var(--foreground)]">{row.school_name}</span>,
    },
    {
      key: 'plan_name',
      header: 'Plan',
      sortable: true,
      accessor: (row) => row.plan_name,
      render: (row) => (
        <Badge variant={PLAN_VARIANT[row.plan_name.toLowerCase()] ?? 'muted'}>{row.plan_name}</Badge>
      ),
    },
    {
      key: 'start_date',
      header: 'Start',
      sortable: true,
      accessor: (row) => row.start_date,
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.start_date)}</span>,
    },
    {
      key: 'end_date',
      header: 'End',
      sortable: true,
      accessor: (row) => row.end_date,
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.end_date)}</span>,
    },
    {
      key: 'amount_paid',
      header: 'Amount',
      sortable: true,
      accessor: (row) => row.amount_paid,
      render: (row) => <span className="font-semibold text-[var(--foreground)] tabular-nums">{formatCurrency(row.amount_paid)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openPayment(row)}>
            <Receipt size={14} /> Record Payment
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <PageHeader title="Subscriptions & Billing" subtitle="Track revenue, renewals and payments" />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} change={momGrowth} loading={isLoading} icon={DollarSign} color="success" />
          <StatsCard title="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} change={momGrowth} loading={isLoading} icon={TrendingUp} color="info" />
          <StatsCard title="Outstanding" value={formatCurrency(stats.outstanding)} loading={isLoading} icon={AlertTriangle} color="danger" subtitle="From expired / suspended" />
          <StatsCard title="Active Subscriptions" value={stats.activeCount} loading={isLoading} icon={CreditCard} color="primary" />
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--primary)]" />
                Revenue (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={18} className="text-orange-500" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">Expiring Soon</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringSoon.map((sub) => {
              const days = daysUntil(sub.end_date)
              return (
                <Card key={sub.id} className="border-l-4 border-l-orange-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--foreground)] truncate">{sub.school_name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub.plan_name} plan</p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 border-0 whitespace-nowrap">
                        {days >= 0 ? `${days}d left` : 'Expired'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Ends {formatDate(sub.end_date)}</span>
                      <Button variant="outline" size="sm" onClick={() => openPayment(sub)}>Renew</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={15} className="text-[var(--muted-foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">Filters</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs gap-1" onClick={resetFilters}>
                    <X size={12} /> Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Month */}
                <div className="space-y-1">
                  <Label className="text-xs">Month</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {availableMonths.map((m) => (
                        <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-1">
                  <Label className="text-xs">Start From</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1">
                  <Label className="text-xs">Start To</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>

                {/* School */}
                <div className="space-y-1">
                  <Label className="text-xs">School</Label>
                  <Select value={filterSchool} onValueChange={setFilterSchool}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All schools</SelectItem>
                      {uniqueSchools.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan */}
                <div className="space-y-1">
                  <Label className="text-xs">Plan</Label>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All plans</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {uniqueStatuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isError && (
          <motion.div
            variants={item}
            className="flex items-start gap-2 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load subscriptions. Please try again.
          </motion.div>
        )}

        <motion.div variants={item}>
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredSubscriptions}
              keyField="id"
              searchable
              searchKeys={['school_name', 'plan_name']}
              searchPlaceholder="Search subscriptions…"
              emptyTitle="No subscriptions"
              emptyDescription="No subscription records match your filters."
            />
          )}
        </motion.div>
      </motion.div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Log a new payment for this subscription.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pay-school">School</Label>
              <Input id="pay-school" value={activeSub?.school_name ?? ''} readOnly className="bg-[var(--muted)]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount (USD)</Label>
              <Input id="pay-amount" type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Payment Date</Label>
              <Input id="pay-date" type="date" defaultValue={today} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              loading={recordPaymentMutation.isPending}
              onClick={() => {
                if (!activeSub) return
                recordPaymentMutation.mutate({
                  id: activeSub.id,
                  payload: { amount_paid: payAmount, payment_method: payMethod, status: 'active' },
                })
              }}
            >
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
