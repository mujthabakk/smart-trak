import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard, Receipt, CalendarClock,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import { mockSubscriptions, mockRevenueData } from '@/lib/mockData'
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

export default function Subscriptions() {
  const [payOpen, setPayOpen] = useState(false)
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS[1])

  const stats = useMemo(() => {
    const totalRevenue = mockRevenueData.reduce((sum, m) => sum + m.revenue, 0)
    const monthlyRevenue = mockRevenueData[mockRevenueData.length - 1]?.revenue ?? 0
    const outstanding = mockSubscriptions
      .filter((s) => s.status === 'expired' || s.status === 'suspended')
      .reduce((sum, s) => sum + s.amount_paid, 0)
    const activeCount = mockSubscriptions.filter((s) => s.status === 'active').length
    return { totalRevenue, monthlyRevenue, outstanding, activeCount }
  }, [])

  const expiringSoon = useMemo(() => {
    const withDays = mockSubscriptions.filter((s) => {
      const d = daysUntil(s.end_date)
      return d >= 0 && d <= 7
    })
    return withDays.length > 0 ? withDays : mockSubscriptions.slice(0, 2)
  }, [])

  function openPayment(sub: Subscription) {
    setActiveSub(sub)
    setPayMethod(sub.payment_method || PAYMENT_METHODS[1])
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
          <StatsCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} change={15} icon={DollarSign} color="success" />
          <StatsCard title="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} change={5} icon={TrendingUp} color="info" />
          <StatsCard title="Outstanding" value={formatCurrency(stats.outstanding)} icon={AlertTriangle} color="danger" subtitle="From expired / suspended" />
          <StatsCard title="Active Subscriptions" value={stats.activeCount} icon={CreditCard} color="primary" />
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
                <AreaChart data={mockRevenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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

        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={mockSubscriptions}
            keyField="id"
            searchable
            searchKeys={['school_name', 'plan_name']}
            searchPlaceholder="Search subscriptions…"
            emptyTitle="No subscriptions"
            emptyDescription="No subscription records match your search."
          />
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
              <Input id="pay-amount" type="number" defaultValue={activeSub?.amount_paid ?? 0} />
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
            <Button onClick={() => setPayOpen(false)}>Submit Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
