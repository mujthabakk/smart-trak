import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Plus, Inbox, Loader2, CheckCircle2, Tag, User, Clock,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { allSupportTickets } from '@/lib/mockData'
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { SupportTicket, TicketPriority } from '@/types'

const SCHOOL_ID = 'sch_001'
const SCHOOL_NAME = 'Al-Noor International School'

const PRIORITY_VARIANT: Record<TicketPriority, 'success' | 'warning' | 'destructive' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
}

const STATUS_FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'open' as const, label: 'Open' },
  { value: 'in_progress' as const, label: 'In Progress' },
  { value: 'resolved' as const, label: 'Resolved' },
  { value: 'escalated' as const, label: 'Escalated' },
]

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    allSupportTickets.filter((t) => t.school_id === SCHOOL_ID),
  )
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()))

  // raise-ticket dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0])
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [description, setDescription] = useState('')

  const stats = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  }), [tickets])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return tickets
    return tickets.filter((t) => t.status === statusFilter)
  }, [tickets, statusFilter])

  function resetForm() {
    setSubject('')
    setCategory(SUPPORT_CATEGORIES[0])
    setPriority('medium')
    setDescription('')
  }

  function submitTicket() {
    if (!subject || !description) return
    const newTicket: SupportTicket = {
      id: `TKT-${Date.now()}`,
      school_id: SCHOOL_ID,
      school_name: SCHOOL_NAME,
      reporter_id: 'sa_001',
      reporter_name: 'Hassan Al-Rashid',
      reporter_role: 'school_admin',
      type: category,
      priority,
      status: 'open',
      description,
      created_at: new Date().toISOString(),
      replies: [],
    }
    setTickets((prev) => [newTicket, ...prev])
    resetForm()
    setDialogOpen(false)
  }

  return (
    <Layout>
      <PageHeader
        title="Support"
        subtitle="Raise tickets and track responses from the SmartTrack team"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Raise Ticket
          </Button>
        }
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Horizontal Calendar */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-4 pb-3">
              <HorizontalCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard title="Open" value={stats.open} icon={Inbox} color="info" />
          <StatsCard title="In Progress" value={stats.inProgress} icon={Loader2} color="warning" />
          <StatsCard title="Resolved" value={stats.resolved} icon={CheckCircle2} color="success" />
        </motion.div>

        {/* Status filter pills */}
        <motion.div variants={item} className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                statusFilter === f.value
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/60',
              )}
            >
              {f.label}
              <span className={cn(
                'ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                statusFilter === f.value ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]',
              )}>
                {f.value === 'all' ? tickets.length : tickets.filter((t) => t.status === f.value).length}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Ticket list */}
        <motion.div variants={item} className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={LifeBuoy}
                title="No tickets found"
                description="No support tickets match your filter. Raise a ticket to get started."
                action={
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus size={16} /> Raise Ticket
                  </Button>
                }
              />
            </div>
          ) : (
            filtered.map((t) => {
              const subjectLine = t.description.split(/[.!?]/)[0].trim()
              return (
                <motion.div
                  key={t.id}
                  variants={item}
                  layout
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">{t.id}</span>
                        <StatusBadge status={t.status} size="sm" />
                        <Badge variant={PRIORITY_VARIANT[t.priority]} className="capitalize text-xs">
                          {t.priority}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-[var(--foreground)] mb-1">{subjectLine}</p>
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{t.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1.5">
                      <Tag size={11} className="text-[var(--primary)]" /> {t.type}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={11} className="text-[var(--primary)]" /> {t.reporter_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} className="text-[var(--primary)]" /> {formatDate(t.created_at, 'datetime')}
                    </span>
                    {t.replies.length > 0 && (
                      <span className="ml-auto rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium">
                        {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </motion.div>

      {/* Raise ticket dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy size={18} className="text-[var(--primary)]" /> Raise a Ticket
            </DialogTitle>
            <DialogDescription>Describe your issue and our team will respond shortly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="tkt-subject">Subject</Label>
              <Input
                id="tkt-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tkt-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="tkt-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tkt-priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger id="tkt-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tkt-desc">Description</Label>
              <Textarea
                id="tkt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible…"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitTicket} disabled={!subject || !description}>
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
