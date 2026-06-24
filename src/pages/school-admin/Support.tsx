import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Plus, Inbox, Loader2, CheckCircle2, Send,
  MessageSquare, Tag, User,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { formatDate, getInitials } from '@/lib/utils'
import type { SupportTicket, TicketReply, TicketPriority } from '@/types'

const SCHOOL_ID = 'sch_001'
const SCHOOL_NAME = 'Al-Noor International School'

const PRIORITY_VARIANT: Record<TicketPriority, 'success' | 'warning' | 'destructive' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
}

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    allSupportTickets.filter((t) => t.school_id === SCHOOL_ID),
  )
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = allSupportTickets.find((t) => t.school_id === SCHOOL_ID)
    return first?.id ?? null
  })
  const [reply, setReply] = useState('')

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

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  )

  function sendReply() {
    if (!selected || !reply.trim()) return
    const newReply: TicketReply = {
      id: `rpl_${Date.now()}`,
      ticket_id: selected.id,
      user_id: 'sa_001',
      user_name: 'Hassan Al-Rashid',
      user_role: 'school_admin',
      content: reply.trim(),
      created_at: new Date().toISOString(),
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, replies: [...t.replies, newReply] } : t)),
    )
    setReply('')
  }

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
    setSelectedId(newTicket.id)
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard title="Open" value={stats.open} icon={Inbox} color="info" />
        <StatsCard title="In Progress" value={stats.inProgress} icon={Loader2} color="warning" />
        <StatsCard title="Resolved" value={stats.resolved} icon={CheckCircle2} color="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* LEFT — ticket list */}
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <LifeBuoy size={16} className="text-[var(--primary)]" /> My Tickets
            </h3>
            <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
              {tickets.length}
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-[560px]">
            {tickets.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" strokeWidth={1.5} />
                <p className="text-sm text-[var(--muted-foreground)]">No tickets yet.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedId === t.id
                const subjectLine = t.description.split(/[.!?]/)[0].trim()
                return (
                  <motion.button
                    key={t.id}
                    layout
                    whileHover={{ x: 2 }}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
                        {subjectLine}
                      </p>
                      <Badge variant={PRIORITY_VARIANT[t.priority]} className="flex-shrink-0 capitalize">
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{t.type}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusBadge status={t.status} size="sm" />
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {formatDate(t.created_at, 'relative')}
                      </span>
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT — detail panel */}
        <div className="flex min-h-[480px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {selected ? (
            <>
              <div className="border-b border-[var(--border)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--foreground)]">{selected.id}</h2>
                      <StatusBadge status={selected.status} size="sm" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1.5">
                        <Tag size={12} className="text-[var(--primary)]" /> {selected.type}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User size={12} className="text-[var(--primary)]" /> {selected.reporter_name}
                      </span>
                      <span>{formatDate(selected.created_at, 'datetime')}</span>
                    </div>
                  </div>
                  <Badge variant={PRIORITY_VARIANT[selected.priority]} className="capitalize">
                    {selected.priority} priority
                  </Badge>
                </div>
              </div>

              {/* thread */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5 lg:max-h-[400px]">
                {/* original description bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-br-sm bg-[var(--primary)] px-4 py-2.5 text-sm text-[var(--primary-foreground)]">
                      {selected.description}
                    </div>
                    <p className="mt-1 text-right text-[11px] text-[var(--muted-foreground)]">
                      {selected.reporter_name} · {formatDate(selected.created_at, 'time')}
                    </p>
                  </div>
                </div>

                {selected.replies.map((r) => {
                  const fromSchool = r.user_role === 'school_admin' || r.user_role === 'parent' || r.user_role === 'driver'
                  return (
                    <div key={r.id} className={cn('flex', fromSchool ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%]', !fromSchool && 'flex items-start gap-2')}>
                        {!fromSchool && (
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="bg-[var(--muted)] text-[10px] font-semibold text-[var(--muted-foreground)]">
                              {getInitials(r.user_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div
                            className={cn(
                              'px-4 py-2.5 text-sm',
                              fromSchool
                                ? 'rounded-2xl rounded-br-sm bg-[var(--primary)] text-[var(--primary-foreground)]'
                                : 'rounded-2xl rounded-bl-sm bg-[var(--muted)] text-[var(--foreground)]',
                            )}
                          >
                            {r.content}
                          </div>
                          <p className={cn('mt-1 text-[11px] text-[var(--muted-foreground)]', fromSchool && 'text-right')}>
                            {r.user_name} · {formatDate(r.created_at, 'time')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* reply box */}
              <div className="border-t border-[var(--border)] p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    className="min-h-[44px] flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        sendReply()
                      }
                    }}
                  />
                  <Button onClick={sendReply} disabled={!reply.trim()} className="h-11">
                    <Send size={16} /> Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a ticket"
              description="Choose a ticket from the list to view its conversation and reply."
            />
          )}
        </div>
      </div>

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
