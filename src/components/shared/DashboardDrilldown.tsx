import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { School as SchoolIcon, CreditCard, AlertCircle, DollarSign, Users, Bus, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockSchools, mockRevenueData } from '@/lib/mockData'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { School } from '@/types'

export type DrillMetric = 'schools' | 'active' | 'expired' | 'revenue' | 'students' | 'drivers'

const PLAN_VARIANT: Record<string, 'muted' | 'info' | 'secondary'> = { basic: 'muted', standard: 'info', premium: 'secondary' }

const META: Record<DrillMetric, { title: string; value: string; subtitle: string; icon: typeof SchoolIcon; route: string }> = {
  schools: { title: 'Total Schools', value: '99', subtitle: 'All registered schools on the platform', icon: SchoolIcon, route: '/super-admin/schools' },
  active: { title: 'Active Subscriptions', value: '87', subtitle: 'Schools with an active subscription', icon: CreditCard, route: '/super-admin/subscriptions' },
  expired: { title: 'Expired / Suspended', value: '8', subtitle: 'Schools that need renewal attention', icon: AlertCircle, route: '/super-admin/subscriptions' },
  revenue: { title: 'Total Revenue', value: '$186,400', subtitle: 'Collected across the last 12 months', icon: DollarSign, route: '/super-admin/reports' },
  students: { title: 'Total Students', value: '24,580', subtitle: 'Students enrolled across all schools', icon: Users, route: '/super-admin/schools' },
  drivers: { title: 'Total Drivers', value: '420', subtitle: 'Drivers operating across all schools', icon: Bus, route: '/super-admin/schools' },
}

function StatCol({ row, field }: { row: School; field: 'student_count' | 'driver_count' | 'bus_count' }) {
  return <span className="tabular-nums text-[var(--foreground)] font-medium">{formatNumber(row[field] ?? 0)}</span>
}

export function DashboardDrilldown({ metric, onClose }: { metric: DrillMetric | null; onClose: () => void }) {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('12')

  const meta = metric ? META[metric] : null

  // base rows for school-based metrics
  const rows = useMemo(() => {
    if (!metric || metric === 'revenue') return []
    let list = [...mockSchools]
    if (metric === 'active') list = list.filter((s) => s.status === 'active')
    if (metric === 'expired') list = list.filter((s) => s.status === 'suspended' || s.status === 'pending')
    if (plan !== 'all') list = list.filter((s) => s.plan_name.toLowerCase() === plan)
    if (metric === 'schools' && status !== 'all') list = list.filter((s) => s.status === status)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q))
    }
    if (metric === 'students') list.sort((a, b) => (b.student_count ?? 0) - (a.student_count ?? 0))
    if (metric === 'drivers') list.sort((a, b) => (b.driver_count ?? 0) - (a.driver_count ?? 0))
    return list
  }, [metric, plan, status, query])

  const revenueRows = useMemo(() => {
    const n = period === 'all' ? mockRevenueData.length : Number(period)
    return mockRevenueData.slice(-n)
  }, [period])
  const revenueTotal = useMemo(() => revenueRows.reduce((sum, r) => sum + r.revenue, 0), [revenueRows])

  const columns: Column<School>[] = [
    {
      key: 'name', header: 'School',
      render: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--foreground)] truncate">{s.name}</p>
          <p className="text-xs text-[var(--muted-foreground)] truncate">{s.city ?? '—'}</p>
        </div>
      ),
    },
    { key: 'plan_name', header: 'Plan', render: (s) => <Badge variant={PLAN_VARIANT[s.plan_name.toLowerCase()] ?? 'muted'}>{s.plan_name}</Badge> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'student_count', header: 'Students', render: (s) => <StatCol row={s} field="student_count" /> },
    { key: 'driver_count', header: 'Drivers', render: (s) => <StatCol row={s} field="driver_count" /> },
  ]

  return (
    <Dialog open={!!metric} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-3xl">
        {meta && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <meta.icon size={22} className="text-[var(--primary)]" />
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2">{meta.title}<span className="text-[var(--primary)]">· {meta.value}</span></DialogTitle>
                  <DialogDescription>{meta.subtitle}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {metric === 'revenue' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/15 px-4 py-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Total for period</p>
                    <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(revenueTotal)}</p>
                  </div>
                  <div className="w-44">
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Last 3 months</SelectItem>
                        <SelectItem value="6">Last 6 months</SelectItem>
                        <SelectItem value="12">Last 12 months</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] overflow-hidden max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--muted)]/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Month</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Revenue</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Active Schools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueRows.map((r) => (
                        <tr key={r.month} className="border-t border-[var(--border)]">
                          <td className="px-4 py-2.5 text-[var(--foreground)]">{r.month}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[var(--foreground)]">{formatCurrency(r.revenue)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">{r.schools}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[160px]">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search schools…" />
                  </div>
                  <div className="w-36">
                    <Select value={plan} onValueChange={setPlan}>
                      <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All plans</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {metric === 'schools' && (
                    <div className="w-36">
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[var(--muted-foreground)]">Showing {rows.length} school{rows.length === 1 ? '' : 's'}</p>

                <div className="max-h-[42vh] overflow-y-auto rounded-xl">
                  <DataTable columns={columns} data={rows} keyField="id" pageSize={6} emptyTitle="No matching schools" emptyDescription="Adjust the filters above." />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => { onClose(); navigate(meta.route) }}>
                Open full page <ArrowRight size={15} />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DashboardDrilldown
