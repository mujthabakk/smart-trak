import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Clock, Loader2, CheckCircle, Timer, Send, AlertTriangle, Eye, User,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatDate, getInitials, getRoleLabel } from '@/lib/utils'
import { mockTickets } from '@/lib/mockData'
import { SUPPORT_PRIORITIES } from '@/lib/constants'
import type { SupportTicket, TicketReply, TicketStatus, TicketPriority } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PRIORITY_VARIANT: Record<TicketPriority, 'success' | 'warning' | 'destructive'> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
}

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'escalated']

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [reply, setReply] = useState('')
  const [assignTo, setAssignTo] = useState('')

  const stats = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }), [tickets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (q && !(`${t.id} ${t.school_name ?? ''} ${t.reporter_name} ${t.type}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [tickets, statusFilter, priorityFilter, search])

  function openTicket(t: SupportTicket) {
    setSelected(t)
    setReply('')
    setAssignTo(t.assigned_to ?? '')
  }

  function updateSelected(patch: Partial<SupportTicket>) {
    if (!selected) return
    const next = { ...selected, ...patch }
    setSelected(next)
    setTickets((prev) => prev.map((t) => (t.id === next.id ? next : t)))
  }

  function sendReply() {
    if (!selected || !reply.trim()) return
    const newReply: TicketReply = {
      id: `rpl_${Date.now()}`,
      ticket_id: selected.id,
      user_id: 'admin_001',
      user_name: 'Support Agent',
      user_role: 'super_admin',
      content: reply.trim(),
      created_at: new Date().toISOString(),
    }
    updateSelected({ replies: [...selected.replies, newReply] })
    setReply('')
  }

  const columns: Column<SupportTicket>[] = [
    {
      key: 'id',
      header: 'Ticket',
      sortable: true,
      accessor: (row) => row.id,
      render: (row) => <span className="font-semibold text-[var(--foreground)] tabular-nums">{row.id}</span>,
    },
    {
      key: 'school_name',
      header: 'School',
      sortable: true,
      accessor: (row) => row.school_name ?? '',
      render: (row) => <span className="text-[var(--foreground)] truncate">{row.school_name ?? '—'}</span>,
    },
    {
      key: 'reporter_name',
      header: 'Reporter',
      sortable: true,
      accessor: (row) => row.reporter_name,
      render: (row) => (
        <div className="min-w-0">
          <p className="text-[var(--foreground)] truncate">{row.reporter_name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{getRoleLabel(row.reporter_role)}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      sortable: true,
      accessor: (row) => row.type,
      render: (row) => <Badge variant="muted">{row.type}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      accessor: (row) => row.priority,
      render: (row) => (
        <Badge variant={PRIORITY_VARIANT[row.priority]} className="capitalize">{row.priority}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      accessor: (row) => row.created_at,
      render: (row) => (
        <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.created_at, 'relative')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => openTicket(row)}>
            <Eye size={14} /> View
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <PageHeader title="Support Tickets" subtitle="Global support queue across all schools" />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard title="Open" value={stats.open} icon={Clock} color="info" />
          <StatsCard title="In Progress" value={stats.inProgress} icon={Loader2} color="warning" />
          <StatsCard title="Resolved Today" value={stats.resolved} icon={CheckCircle} color="success" />
          <StatsCard title="Avg Resolution" value="4.2h" icon={Timer} color="primary" subtitle="Last 30 days" />
        </motion.div>

        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(row) => openTicket(row)}
            emptyTitle="No tickets found"
            emptyDescription="No support tickets match the selected filters."
            toolbar={
              <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
                <div className="relative w-full sm:w-48">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tickets…"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {SUPPORT_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </motion.div>
      </motion.div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle>{selected.id}</DialogTitle>
                  <Badge variant={PRIORITY_VARIANT[selected.priority]} className="capitalize">{selected.priority}</Badge>
                  <StatusBadge status={selected.status} />
                </div>
                <DialogDescription>{selected.type} · {selected.school_name ?? 'Platform'}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Reporter */}
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">
                      {getInitials(selected.reporter_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{selected.reporter_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {getRoleLabel(selected.reporter_role)} · {formatDate(selected.created_at, 'datetime')}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-xl bg-[var(--muted)]/40 p-4">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Description</p>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">{selected.description}</p>
                </div>

                {/* Reply thread */}
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Conversation</p>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    {selected.replies.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No replies yet.</p>
                    ) : (
                      selected.replies.map((r) => {
                        const mine = r.user_role === 'super_admin'
                        return (
                          <div key={r.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                                mine
                                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                  : 'bg-[var(--muted)] text-[var(--foreground)]'
                              }`}
                            >
                              <p className="text-[11px] font-medium opacity-80 mb-0.5">{r.user_name}</p>
                              <p className="leading-relaxed">{r.content}</p>
                              <p className="text-[10px] opacity-70 mt-1">{formatDate(r.created_at, 'time')}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <Separator />

                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={(v) => updateSelected({ status: v as TicketStatus })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-to">Assign To</Label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input
                        id="assign-to"
                        value={assignTo}
                        onChange={(e) => setAssignTo(e.target.value)}
                        onBlur={() => updateSelected({ assigned_to: assignTo })}
                        placeholder="Agent name"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Reply box */}
                <div className="space-y-1.5">
                  <Label htmlFor="reply">Reply</Label>
                  <Textarea
                    id="reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply…"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => updateSelected({ status: 'escalated' })}
                  >
                    <AlertTriangle size={14} /> Escalate
                  </Button>
                  <Button onClick={sendReply} disabled={!reply.trim()}>
                    <Send size={14} /> Send Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
