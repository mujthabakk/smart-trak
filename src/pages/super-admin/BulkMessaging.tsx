import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, Send, Bus, Bell, CalendarClock, Megaphone,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { mockSchools, mockPlans } from '@/lib/mockData'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const MAX_CHARS = 500

type Audience = 'all' | 'plan' | 'specific'

interface SentMessage {
  id: string
  title: string
  audience: string
  sentAt: string
  recipients: number
  deliveryPct: number
  status: 'sent' | 'scheduled' | 'sending'
}

const MESSAGE_HISTORY: SentMessage[] = [
  { id: 'bm_001', title: 'Scheduled Maintenance Tonight', audience: 'All Schools', sentAt: '2026-06-22T20:00:00Z', recipients: 99, deliveryPct: 100, status: 'sent' },
  { id: 'bm_002', title: 'New Guest Driver Feature', audience: 'Premium Plan', sentAt: '2026-06-20T10:30:00Z', recipients: 24, deliveryPct: 96, status: 'sent' },
  { id: 'bm_003', title: 'Billing Cycle Reminder', audience: 'Basic Plan', sentAt: '2026-06-18T09:00:00Z', recipients: 31, deliveryPct: 88, status: 'sent' },
  { id: 'bm_004', title: 'Term Break Schedule', audience: 'Specific (3 schools)', sentAt: '2026-06-25T08:00:00Z', recipients: 3, deliveryPct: 0, status: 'scheduled' },
  { id: 'bm_005', title: 'App Update v2.4 Available', audience: 'All Schools', sentAt: '2026-06-15T14:00:00Z', recipients: 94, deliveryPct: 72, status: 'sending' },
]

const STATUS_VARIANT: Record<SentMessage['status'], 'success' | 'info' | 'warning'> = {
  sent: 'success',
  scheduled: 'info',
  sending: 'warning',
}

export default function BulkMessaging() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [planTier, setPlanTier] = useState<string>(mockPlans[0].id)
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [scheduled, setScheduled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')

  function toggleSchool(id: string) {
    setSelectedSchools((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const audienceLabel = useMemo(() => {
    if (audience === 'all') return `All Schools (${mockSchools.length})`
    if (audience === 'plan') {
      const plan = mockPlans.find((p) => p.id === planTier)
      const count = mockSchools.filter((s) => s.plan_id === planTier).length
      return `${plan?.label ?? 'Plan'} (${count})`
    }
    return `Specific (${selectedSchools.length} selected)`
  }, [audience, planTier, selectedSchools])

  const columns: Column<SentMessage>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      accessor: (row) => row.title,
      render: (row) => <span className="font-medium text-[var(--foreground)] truncate">{row.title}</span>,
    },
    {
      key: 'audience',
      header: 'Audience',
      sortable: true,
      accessor: (row) => row.audience,
      render: (row) => <span className="text-[var(--muted-foreground)]">{row.audience}</span>,
    },
    {
      key: 'recipients',
      header: 'Recipients',
      sortable: true,
      accessor: (row) => row.recipients,
      render: (row) => <span className="text-[var(--foreground)] tabular-nums">{row.recipients}</span>,
    },
    {
      key: 'deliveryPct',
      header: 'Delivery',
      sortable: true,
      accessor: (row) => row.deliveryPct,
      render: (row) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={row.deliveryPct} className="h-1.5 flex-1" />
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums w-9 text-right">{row.deliveryPct}%</span>
        </div>
      ),
    },
    {
      key: 'sentAt',
      header: 'Sent',
      sortable: true,
      accessor: (row) => row.sentAt,
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.sentAt, 'datetime')}</span>,
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
                        {mockPlans.map((p) => (
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
                      {mockSchools.map((s) => (
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
                  </div>
                )}

                <Button className="w-full" disabled={!title.trim() || !message.trim()}>
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
          <DataTable
            columns={columns}
            data={MESSAGE_HISTORY}
            keyField="id"
            searchable
            searchKeys={['title', 'audience']}
            searchPlaceholder="Search messages…"
            emptyTitle="No messages sent"
            emptyDescription="Your broadcast history will appear here."
          />
        </motion.div>
      </motion.div>
    </Layout>
  )
}
