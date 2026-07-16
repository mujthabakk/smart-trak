import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  MessageSquare, Send, Bus, Bell, CalendarClock, Megaphone, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { listMessages, sendMessage } from '@/lib/api/messages'
import { listSchools } from '@/lib/api/schools'
import type { Message } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const MAX_CHARS = 500

type Audience = 'all' | 'plan' | 'specific'

const RECIPIENT_LABELS: Record<Message['recipient_type'], string> = {
  all_parents: 'All Parents',
  route_parents: 'Route Parents',
  individual: 'Individual',
  all_drivers: 'All Drivers',
  driver: 'Driver',
  admin: 'School Admin',
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function BulkMessaging() {
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [planTier, setPlanTier] = useState<string>('')
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [scheduled, setScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [sendError, setSendError] = useState('')

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', 'picker'],
    queryFn: () => listSchools({ pageSize: 100 }),
  })
  const schools = useMemo(() => schoolsData?.schools ?? [], [schoolsData])

  const plans = useMemo(() => {
    const seen = new Map<string, string>()
    schools.forEach((s) => { if (!seen.has(s.plan_id)) seen.set(s.plan_id, s.plan_name) })
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }))
  }, [schools])

  const { data: messagesData, isLoading, isError } = useQuery({
    queryKey: ['messages'],
    queryFn: () => listMessages({ pageSize: 100 }),
  })
  const messages = messagesData?.messages ?? []

  const schoolNameById = useMemo(() => {
    const map = new Map<string, string>()
    schools.forEach((s) => map.set(s.id, s.name))
    return map
  }, [schools])

  function toggleSchool(id: string) {
    setSelectedSchools((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const targetSchools = useMemo(() => {
    if (audience === 'all') return schools
    if (audience === 'plan') return schools.filter((s) => s.plan_id === planTier)
    return schools.filter((s) => selectedSchools.includes(s.id))
  }, [audience, schools, planTier, selectedSchools])

  const audienceLabel = useMemo(() => {
    if (audience === 'all') return `All Schools (${schools.length})`
    if (audience === 'plan') {
      const plan = plans.find((p) => p.id === planTier)
      return `${plan?.label ?? 'Plan'} (${targetSchools.length})`
    }
    return `Specific (${selectedSchools.length} selected)`
  }, [audience, schools.length, plans, planTier, targetSchools.length, selectedSchools.length])

  const sendMutation = useMutation({
    mutationFn: async () => {
      const content = title.trim() ? `${title.trim()}\n\n${message.trim()}` : message.trim()
      const scheduledIso = scheduled && scheduleAt ? new Date(scheduleAt).toISOString() : undefined
      await Promise.all(
        targetSchools.map((s) =>
          sendMessage({
            school_id: s.id,
            recipient_type: 'admin',
            content,
            is_scheduled: scheduled,
            scheduled_at: scheduledIso,
          }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setTitle('')
      setMessage('')
      setSelectedSchools([])
      setScheduled(false)
      setScheduleAt('')
      setSendError('')
    },
    onError: (err) => setSendError(extractErrorMessage(err)),
  })

  function handleSend() {
    if (!title.trim() || !message.trim()) return
    if (targetSchools.length === 0) {
      setSendError('Select at least one school to send to.')
      return
    }
    if (scheduled && !scheduleAt) {
      setSendError('Please choose a send date/time.')
      return
    }
    setSendError('')
    sendMutation.mutate()
  }

  const columns: Column<Message>[] = [
    {
      key: 'content',
      header: 'Message',
      accessor: (row) => row.content,
      render: (row) => <span className="font-medium text-[var(--foreground)] truncate block max-w-xs">{row.content}</span>,
    },
    {
      key: 'recipient_type',
      header: 'Recipient',
      sortable: true,
      accessor: (row) => row.recipient_type,
      render: (row) => <span className="text-[var(--muted-foreground)]">{RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type}{row.recipient_name ? ` · ${row.recipient_name}` : ''}</span>,
    },
    {
      key: 'school_id',
      header: 'School',
      sortable: true,
      accessor: (row) => schoolNameById.get(row.school_id) ?? '',
      render: (row) => <span className="text-[var(--foreground)]">{schoolNameById.get(row.school_id) ?? '—'}</span>,
    },
    {
      key: 'sent_at',
      header: 'Sent',
      sortable: true,
      accessor: (row) => row.sent_at,
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.sent_at, 'datetime')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (row) => (row.is_scheduled ? 'scheduled' : 'sent'),
      render: (row) => <StatusBadge status={row.is_scheduled ? 'scheduled' : 'sent'} />,
    },
  ]

  return (
    <Layout>
      <PageHeader title="Bulk Messaging" subtitle="Broadcast push notifications to schools" />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone size={18} className="text-[var(--primary)]" />
                  Compose Broadcast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {sendError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {sendError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="bm-title">Title</Label>
                  <Input
                    id="bm-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notification title"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bm-message">Message</Label>
                    <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
                      {message.length}/{MAX_CHARS}
                    </span>
                  </div>
                  <Textarea
                    id="bm-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Write your announcement…"
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'all', label: 'All Schools' },
                      { id: 'plan', label: 'By Plan Tier' },
                      { id: 'specific', label: 'Specific Schools' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudience(opt.id)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          audience === opt.id
                            ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {audience === 'plan' && (
                  <div className="space-y-1.5">
                    <Label>Plan Tier</Label>
                    <Select value={planTier} onValueChange={setPlanTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audience === 'specific' && (
                  <div className="space-y-1.5">
                    <Label>Select Schools</Label>
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                      {schools.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedSchools.includes(s.id)}
                            onCheckedChange={() => toggleSchool(s.id)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--foreground)] truncate">{s.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{s.city} · {s.plan_name}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--foreground)]">Schedule for later</span>
                  </div>
                  <Switch checked={scheduled} onCheckedChange={setScheduled} />
                </div>

                {scheduled && (
                  <div className="space-y-1.5">
                    <Label htmlFor="bm-schedule">Send At</Label>
                    <Input
                      id="bm-schedule"
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Scheduled messages are stored as pending — the platform does not yet auto-dispatch them at the scheduled time.
                    </p>
                  </div>
                )}

                <Button className="w-full" disabled={!title.trim() || !message.trim()} loading={sendMutation.isPending} onClick={handleSend}>
                  <Send size={16} /> {scheduled ? 'Schedule Broadcast' : 'Send Now'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Phone preview */}
          <motion.div variants={item}>
            <Card className="rounded-2xl h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Bell size={18} className="text-[var(--primary)]" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mx-auto w-full max-w-[260px]">
                  <div className="rounded-[2.5rem] border-8 border-[var(--foreground)]/90 bg-gradient-to-b from-[var(--primary)]/20 to-[var(--primary)]/5 p-3 shadow-xl">
                    <div className="h-5 flex items-center justify-center">
                      <div className="h-1.5 w-16 rounded-full bg-[var(--foreground)]/30" />
                    </div>
                    <div className="mt-8 mb-4 text-center">
                      <p className="text-3xl font-light text-[var(--foreground)] tabular-nums">9:41</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Monday, June 23</p>
                    </div>
                    {/* Notification card */}
                    <div className="rounded-2xl bg-[var(--card)]/95 backdrop-blur border border-[var(--border)] p-3 shadow-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-6 w-6 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                          <Bus size={13} className="text-[var(--primary-foreground)]" />
                        </div>
                        <span className="text-xs font-semibold text-[var(--foreground)]">SmartTrack</span>
                        <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">now</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--foreground)] leading-snug">
                        {title.trim() || 'Notification title'}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mt-0.5 line-clamp-4">
                        {message.trim() || 'Your message preview will appear here as you type.'}
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-xs text-[var(--muted-foreground)] mt-3">
                    Sending to <span className="font-medium text-[var(--foreground)]">{audienceLabel}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* History */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">Message History</h2>
          </div>

          {isError && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load message history. Please try again.
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
          ) : (
            <DataTable
              columns={columns}
              data={messages}
              keyField="id"
              searchable
              searchKeys={['content']}
              searchPlaceholder="Search messages…"
              emptyTitle="No messages sent"
              emptyDescription="Your broadcast history will appear here."
            />
          )}
        </motion.div>
      </motion.div>
    </Layout>
  )
}
