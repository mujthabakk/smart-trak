import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarOff, Clock, CheckCircle2, XCircle, CalendarRange,
  Check, X, Eye, Search,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { allLeaves, allStudents } from '@/lib/mockData'
import { formatDate, getInitials } from '@/lib/utils'
import type { Leave as LeaveType, LeaveStatus } from '@/types'

const SCHOOL_ID = 'sch_001'

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

function studentOf(studentId: string) {
  return allStudents.find((s) => s.id === studentId)
}

function parentOf(studentId: string): string {
  const student = studentOf(studentId)
  return student?.parents?.[0]?.parent_name ?? 'Parent'
}

// ─── Status badge helpers ─────────────────────────────────────────────────────
function leaveStatusClass(status: LeaveStatus) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
}

function rowBorderClass(status: LeaveStatus) {
  switch (status) {
    case 'pending':
      return 'border-l-4 border-amber-400'
    case 'approved':
      return 'border-l-4 border-green-500'
    case 'rejected':
      return 'border-l-4 border-red-500'
  }
}

// ─── Stats card tint helpers ──────────────────────────────────────────────────
const STAT_TINTS = {
  pending:  'bg-amber-50  dark:bg-amber-900/10  border-amber-100  dark:border-amber-800/30',
  approved: 'bg-green-50  dark:bg-green-900/10  border-green-100  dark:border-green-800/30',
  rejected: 'bg-red-50    dark:bg-red-900/10    border-red-100    dark:border-red-800/30',
  month:    'bg-blue-50   dark:bg-blue-900/10   border-blue-100   dark:border-blue-800/30',
}

// ─── Filter status pill options ───────────────────────────────────────────────
const STATUS_FILTERS: Array<{ value: LeaveStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

// ─── Inline colored badge ─────────────────────────────────────────────────────
function LeaveBadge({ status }: { status: LeaveStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaveStatusClass(status)}`}>
      {label}
    </span>
  )
}

// ─── Leave detail dialog ──────────────────────────────────────────────────────
interface DetailDialogProps {
  leave: LeaveType | null
  onClose: () => void
  onDecide: (id: string, status: Exclude<LeaveStatus, 'pending'>) => void
}

function LeaveDetailDialog({ leave, onClose, onDecide }: DetailDialogProps) {
  if (!leave) return null
  const student = studentOf(leave.student_id)
  const parent = student?.parents?.[0]

  return (
    <Dialog open={!!leave} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                {getInitials(leave.student_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">{leave.student_name}</p>
              <p className="text-xs font-normal text-[var(--muted-foreground)]">Class {leave.student_class ?? '—'}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Parent info */}
          {parent && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Parent / Guardian</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{parent.parent_name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{parent.phone}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{parent.email}</p>
            </div>
          )}

          {/* Leave period */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">From</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatDate(leave.from_date)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">To</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatDate(leave.to_date)}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Days</p>
              <p className="mt-1 text-sm font-bold text-[var(--foreground)]">{daysBetween(leave.from_date, leave.to_date)}</p>
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Reason</p>
            <p className="text-sm text-[var(--foreground)]">{leave.reason ?? 'Not specified'}</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Status</p>
            <LeaveBadge status={leave.status} />
          </div>

          {/* Actions for pending */}
          {leave.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/40 dark:text-green-400 dark:hover:bg-green-900/20"
                variant="outline"
                onClick={() => { onDecide(leave.id, 'approved'); onClose() }}
              >
                <Check size={14} /> Approve
              </Button>
              <Button
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                variant="outline"
                onClick={() => { onDecide(leave.id, 'rejected'); onClose() }}
              >
                <X size={14} /> Reject
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tinted stats card wrapper ────────────────────────────────────────────────
interface TintedCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  color: 'warning' | 'success' | 'danger' | 'primary'
  subtitle?: string
  tintClass: string
}

function TintedStatsCard({ title, value, icon: Icon, subtitle, tintClass }: TintedCardProps) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tintClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0 rounded-lg bg-[var(--background)]/60 p-2">
          <Icon size={20} className="text-[var(--muted-foreground)]" />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Leave() {
  const schoolStudents = useMemo(
    () => allStudents.filter((s) => s.school_id === SCHOOL_ID),
    [],
  )
  void schoolStudents // used for context / future filtering

  const [leaves, setLeaves] = useState<LeaveType[]>(() =>
    allLeaves.filter((l) => l.school_id === SCHOOL_ID),
  )

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [selectedLeave, setSelectedLeave] = useState<LeaveType | null>(null)

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = leaves.filter((l) => l.status === 'pending').length
    const approved = leaves.filter((l) => l.status === 'approved').length
    const rejected = leaves.filter((l) => l.status === 'rejected').length
    const thisMonth = leaves.filter((l) => {
      const d = new Date(l.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { pending, approved, rejected, thisMonth }
  }, [leaves])

  function decide(id: string, status: Exclude<LeaveStatus, 'pending'>) {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status, approved_by: 'School Admin', approved_at: new Date().toISOString() }
          : l,
      ),
    )
  }

  // ── Filtered data (for the filter bar, applied on top of tab) ────────────────
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (search) {
        const q = search.toLowerCase()
        if (!l.student_name.toLowerCase().includes(q)) return false
      }
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (dateFrom && l.from_date < dateFrom) return false
      if (dateTo && l.to_date > dateTo) return false
      return true
    })
  }, [leaves, search, statusFilter, dateFrom, dateTo])

  // ── Tab data (uses filtered set) ─────────────────────────────────────────────
  function tabData(status: LeaveStatus | 'all'): LeaveType[] {
    if (status === 'all') return filteredLeaves
    return filteredLeaves.filter((l) => l.status === status)
  }

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<LeaveType>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className={`flex items-center gap-3 -ml-4 pl-4 ${rowBorderClass(row.status)}`}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
              {getInitials(row.student_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{row.student_name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Class {row.student_class ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <Badge variant="muted">{row.reason ?? 'Other'}</Badge>,
    },
    {
      key: 'dates',
      header: 'From – To',
      render: (row) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm text-[var(--foreground)]">
          <CalendarRange size={13} className="text-[var(--muted-foreground)]" />
          {formatDate(row.from_date)}
          <span className="text-[var(--muted-foreground)]">→</span>
          {formatDate(row.to_date)}
        </span>
      ),
    },
    {
      key: 'days',
      header: 'Days',
      render: (row) => (
        <span className="tabular-nums text-sm font-medium text-[var(--foreground)]">
          {daysBetween(row.from_date, row.to_date)}
        </span>
      ),
    },
    {
      key: 'requested_by',
      header: 'Requested By',
      render: (row) => (
        <span className="text-sm text-[var(--muted-foreground)]">{parentOf(row.student_id)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <LeaveBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) =>
        row.status === 'pending' ? (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/40 dark:text-green-400 dark:hover:bg-green-900/20"
              onClick={() => decide(row.id, 'approved')}
            >
              <Check size={14} /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => decide(row.id, 'rejected')}
            >
              <X size={14} /> Reject
            </Button>
          </div>
        ) : (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedLeave(row)}
            >
              <Eye size={14} /> View
            </Button>
          </div>
        ),
    },
  ]

  const TABS: Array<{ value: LeaveStatus | 'all'; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ]

  return (
    <Layout>
      <PageHeader
        title="Leave Management"
        subtitle="Review and respond to student leave requests"
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Stats Cards (tinted) ── */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <TintedStatsCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            color="warning"
            subtitle="awaiting review"
            tintClass={STAT_TINTS.pending}
          />
          <TintedStatsCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            color="success"
            tintClass={STAT_TINTS.approved}
          />
          <TintedStatsCard
            title="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="danger"
            tintClass={STAT_TINTS.rejected}
          />
          <TintedStatsCard
            title="This Month"
            value={stats.thisMonth}
            icon={CalendarOff}
            color="primary"
            subtitle="total requests"
            tintClass={STAT_TINTS.month}
          />
        </motion.div>

        {/* ── Filter bar ── */}
        <motion.div variants={item}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search by student name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Date from */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Date to */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              {/* Clear filters */}
              {(search || statusFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo('') }}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
                      active
                        ? f.value === 'pending'
                          ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40'
                          : f.value === 'approved'
                          ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700/40'
                          : f.value === 'rejected'
                          ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/40'
                          : 'bg-[var(--primary)] text-white border-[var(--primary)]'
                        : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Tabs + Table ── */}
        <motion.div variants={item}>
          <Tabs defaultValue="pending">
            <TabsList>
              {TABS.map((t) => {
                const count = tabData(t.value).length
                return (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                    {t.label}
                    <span className="rounded-full bg-[var(--background)]/60 px-1.5 text-[10px] font-semibold tabular-nums">
                      {count}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value}>
                <DataTable
                  columns={columns}
                  data={tabData(t.value)}
                  keyField="id"
                  emptyTitle="No leave requests"
                  emptyDescription={`There are no ${t.value === 'all' ? '' : t.value} leave requests matching your filters.`}
                />
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </motion.div>

      {/* ── Detail dialog ── */}
      <LeaveDetailDialog
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onDecide={decide}
      />
    </Layout>
  )
}
