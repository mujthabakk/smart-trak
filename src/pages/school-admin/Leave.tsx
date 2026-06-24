import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarOff, Plus, Clock, CheckCircle2, XCircle, CalendarRange,
  Check, X, Eye,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { allLeaves, allStudents } from '@/lib/mockData'
import { LEAVE_REASONS } from '@/lib/constants'
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

function parentOf(studentId: string): string {
  const student = allStudents.find((s) => s.id === studentId)
  return student?.parents?.[0]?.parent_name ?? 'Parent'
}

export default function Leave() {
  const schoolStudents = useMemo(
    () => allStudents.filter((s) => s.school_id === SCHOOL_ID),
    [],
  )

  const [leaves, setLeaves] = useState<LeaveType[]>(() =>
    allLeaves.filter((l) => l.school_id === SCHOOL_ID),
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  // New-request form state
  const [formStudent, setFormStudent] = useState('')
  const [formReason, setFormReason] = useState(LEAVE_REASONS[0])
  const [formFrom, setFormFrom] = useState('')
  const [formTo, setFormTo] = useState('')
  const [formNotes, setFormNotes] = useState('')

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

  function resetForm() {
    setFormStudent('')
    setFormReason(LEAVE_REASONS[0])
    setFormFrom('')
    setFormTo('')
    setFormNotes('')
  }

  function submitRequest() {
    const student = schoolStudents.find((s) => s.id === formStudent)
    if (!student || !formFrom || !formTo) return
    const newLeave: LeaveType = {
      id: `lv_${Date.now()}`,
      student_id: student.id,
      student_name: student.name,
      student_class: `${student.class}${student.division}`,
      school_id: SCHOOL_ID,
      from_date: formFrom,
      to_date: formTo,
      reason: formReason,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    setLeaves((prev) => [newLeave, ...prev])
    resetForm()
    setDialogOpen(false)
  }

  const columns: Column<LeaveType>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
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
      render: (row) => <StatusBadge status={row.status} size="sm" />,
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
            <Button size="sm" variant="ghost">
              <Eye size={14} /> View
            </Button>
          </div>
        ),
    },
  ]

  function tabData(status: LeaveStatus | 'all'): LeaveType[] {
    if (status === 'all') return leaves
    return leaves.filter((l) => l.status === status)
  }

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
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> New Leave Request
          </Button>
        }
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatsCard title="Pending" value={stats.pending} icon={Clock} color="warning" subtitle="awaiting review" />
          <StatsCard title="Approved" value={stats.approved} icon={CheckCircle2} color="success" />
          <StatsCard title="Rejected" value={stats.rejected} icon={XCircle} color="danger" />
          <StatsCard title="This Month" value={stats.thisMonth} icon={CalendarOff} color="primary" subtitle="total requests" />
        </motion.div>

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
                  searchable
                  searchKeys={['student_name', 'reason']}
                  searchPlaceholder="Search by student or reason…"
                  emptyTitle="No leave requests"
                  emptyDescription={`There are no ${t.value === 'all' ? '' : t.value} leave requests to show.`}
                />
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </motion.div>

      {/* New leave request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Submit a leave request on behalf of a student.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="leave-student">Student</Label>
              <Select value={formStudent} onValueChange={setFormStudent}>
                <SelectTrigger id="leave-student">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {schoolStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · Class {s.class}{s.division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leave-reason">Reason</Label>
              <Select value={formReason} onValueChange={setFormReason}>
                <SelectTrigger id="leave-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leave-from">From</Label>
                <input
                  id="leave-from"
                  type="date"
                  value={formFrom}
                  onChange={(e) => setFormFrom(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-to">To</Label>
                <input
                  id="leave-to"
                  type="date"
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leave-notes">Notes</Label>
              <Textarea
                id="leave-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional details…"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitRequest} disabled={!formStudent || !formFrom || !formTo}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
