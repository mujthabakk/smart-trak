import { useMemo, useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Megaphone, CheckCheck, AlertTriangle, CalendarCheck, Settings2,
  Info, CheckCircle2, XCircle, MessageSquare, CalendarOff, MoreVertical,
  Send, Trash2, Check, AlertCircle, Pencil
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, broadcastNotification, listBroadcasts, updateBroadcast, deleteBroadcast
} from '@/lib/api/notifications'
import { listRoutes } from '@/lib/api/routes'
import { listDrivers } from '@/lib/api/drivers'
import { NOTIFICATION_TYPES } from '@/lib/constants'
import { formatDate, cn } from '@/lib/utils'
import type { AppNotification } from '@/types'

const TYPE_CONFIG: Record<
  string,
  { icon: ComponentType<{ size?: number; className?: string }>; color: string; ring: string }
> = {
  emergency: { icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', ring: 'ring-red-500/30' },
  error: { icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', ring: 'ring-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400', ring: 'ring-orange-500/30' },
  attendance: { icon: CalendarCheck, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', ring: 'ring-blue-500/30' },
  leave: { icon: CalendarOff, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', ring: 'ring-yellow-500/30' },
  success: { icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', ring: 'ring-green-500/30' },
  message: { icon: MessageSquare, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', ring: 'ring-purple-500/30' },
  system: { icon: Settings2, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300', ring: 'ring-slate-500/30' },
  info: { icon: Info, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400', ring: 'ring-cyan-500/30' },
}

function typeConf(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.info
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function NotificationRow({
  n, onToggleRead, onDismiss, index,
}: {
  n: AppNotification
  onToggleRead: (id: string) => void
  onDismiss: (id: string) => void
  index: number
}) {
  const conf = typeConf(n.type)
  const Icon = conf.icon
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
        n.is_read
          ? 'border-[var(--border)] bg-[var(--card)]'
          : 'border-[var(--primary)]/20 bg-[var(--primary)]/[0.04]',
      )}
    >
      {/* type icon */}
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-1', conf.color, conf.ring)}>
        <Icon size={18} />
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-snug', n.is_read ? 'font-medium text-[var(--foreground)]' : 'font-semibold text-[var(--foreground)]')}>
            {n.title}
          </p>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]" aria-label="unread" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-md p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--muted)] focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleRead(n.id)}>
                  <Check size={14} /> Mark as {n.is_read ? 'unread' : 'read'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => onDismiss(n.id)}>
                  <Trash2 size={14} /> Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-[var(--muted-foreground)] leading-relaxed">{n.body}</p>
        <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">{formatDate(n.created_at, 'relative')}</p>
      </div>
    </motion.div>
  )
}

function EditBroadcastDialog({ b, open, onOpenChange }: { b: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(b.title)
  const [message, setMessage] = useState(b.body)
  const [type, setType] = useState<AppNotification['type']>(b.type)
  const [errorMsg, setErrorMsg] = useState('')
  const MAX = 300

  const mutation = useMutation({
    mutationFn: () => updateBroadcast(b.id, { title, body: message, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onOpenChange(false)
    },
    onError: () => setErrorMsg('Failed to update broadcast.')
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={18} className="text-[var(--primary)]" />
            Edit Broadcast
          </DialogTitle>
          <DialogDescription>Update the message for this broadcast.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Bus 42 Delayed"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-message">Message</Label>
              <span className={cn('text-xs tabular-nums', message.length > MAX ? 'text-red-500' : 'text-[var(--muted-foreground)]')}>
                {message.length}/{MAX}
              </span>
            </div>
            <Textarea
              id="edit-message"
              value={message}
              maxLength={MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement…"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v: AppNotification['type']) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
          {errorMsg ? <div className="text-sm text-red-500 font-medium mb-2 sm:mb-0">{errorMsg}</div> : <div />}
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" disabled={mutation.isPending}>Cancel</Button>
            </DialogClose>
            <Button
              disabled={!title.trim() || !message.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Check size={15} className="mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SentBroadcastRow({
  b, index, onDelete
}: {
  b: any
  index: number
  onDelete: (id: string) => void
}) {
  const conf = typeConf(b.type)
  const Icon = conf.icon
  const [editOpen, setEditOpen] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="group relative flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors"
    >
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-1', conf.color, conf.ring)}>
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug">
            {b.title}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]">
              Audience: {b.audience.replace('_', ' ')}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-md p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--muted)] focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => onDelete(b.id)}>
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-[var(--muted-foreground)] leading-relaxed">{b.body}</p>
        <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
          {formatDate(b.created_at, 'relative')} by {b.sender_name || b.sender_email || 'Admin'}
        </p>
      </div>
      <EditBroadcastDialog b={b} open={editOpen} onOpenChange={setEditOpen} />
    </motion.div>
  )
}

function BroadcastDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<'all_parents' | 'specific_route' | 'drivers'>('all_parents')
  const [type, setType] = useState<AppNotification['type']>('info')
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const MAX = 300

  const { data: routesData } = useQuery({
    queryKey: ['routes'],
    queryFn: () => listRoutes(),
  })
  const schoolRoutes = routesData?.routes ?? []

  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => listDrivers(),
  })
  const schoolDrivers = driversData?.drivers ?? []

  const mutation = useMutation({
    mutationFn: () => broadcastNotification({
      title,
      body: message,
      type,
      audience,
      route_ids: audience === 'specific_route' ? selectedRoutes : undefined,
      driver_ids: audience === 'drivers' ? selectedDrivers : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      handleClose()
    },
    onError: () => {
      setErrorMsg('Failed to send broadcast.')
    }
  })

  function toggleDriver(id: string) {
    setSelectedDrivers((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )
  }

  function toggleRoute(id: string) {
    setSelectedRoutes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    )
  }

  function selectAllRoutes() {
    setSelectedRoutes(schoolRoutes.map((r) => r.id))
  }

  function selectAllDrivers() {
    setSelectedDrivers(schoolDrivers.map((d) => d.id))
  }

  function handleClose() {
    setTitle('')
    setMessage('')
    setAudience('all_parents')
    setType('info')
    setSelectedRoutes([])
    setSelectedDrivers([])
    setErrorMsg('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Megaphone size={16} /> New Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone size={18} className="text-[var(--primary)]" />
            New Broadcast
          </DialogTitle>
          <DialogDescription>Send an alert or announcement to your audience.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Title</Label>
            <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Half day tomorrow" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bc-message">Message</Label>
              <span className={cn('text-xs tabular-nums', message.length > MAX ? 'text-red-500' : 'text-[var(--muted-foreground)]')}>
                {message.length}/{MAX}
              </span>
            </div>
            <Textarea
              id="bc-message"
              value={message}
              maxLength={MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement…"
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v: 'all_parents' | 'specific_route' | 'drivers') => { setAudience(v); setSelectedRoutes([]); setSelectedDrivers([]) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_parents">All Parents</SelectItem>
                  <SelectItem value="specific_route">Specific Route</SelectItem>
                  <SelectItem value="drivers">Drivers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: AppNotification['type']) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route multi-select */}
          {audience === 'specific_route' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Routes</Label>
                <button
                  type="button"
                  onClick={selectAllRoutes}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                {schoolRoutes.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--muted)]/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoutes.includes(r.id)}
                      onChange={() => toggleRoute(r.id)}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">{r.name}</span>
                  </label>
                ))}
              </div>
              {selectedRoutes.length > 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">{selectedRoutes.length} route{selectedRoutes.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Driver multi-select */}
          {audience === 'drivers' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Drivers</Label>
                <button
                  type="button"
                  onClick={selectAllDrivers}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                {schoolDrivers.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--muted)]/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(d.id)}
                      onChange={() => toggleDriver(d.id)}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">{d.name}</span>
                  </label>
                ))}
              </div>
              {selectedDrivers.length > 0 && (
                <p className="text-xs text-[var(--muted-foreground)]">{selectedDrivers.length} driver{selectedDrivers.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
          {errorMsg ? <div className="text-sm text-red-500 font-medium mb-2 sm:mb-0">{errorMsg}</div> : <div />}
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>Cancel</Button>
            </DialogClose>
            <Button
              disabled={
                !title.trim() || !message.trim() ||
                (audience === 'specific_route' && selectedRoutes.length === 0) ||
                (audience === 'drivers' && selectedDrivers.length === 0) ||
                mutation.isPending
              }
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Send size={15} className="mr-2" />}
              Send Broadcast
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Notifications() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ pageSize: 100 }),
  })
  const items = useMemo(() => data?.notifications ?? [], [data])

  const { data: broadcastsData, isLoading: isLoadingBroadcasts } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => listBroadcasts({ pageSize: 100 }),
  })
  const sentBroadcasts = useMemo(() => broadcastsData?.broadcasts ?? [], [broadcastsData])

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const dismissMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  
  const deleteBroadcastMutation = useMutation({
    mutationFn: (id: string) => deleteBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // The API only exposes an endpoint to mark a notification as read — there's
  // no "mark as unread" endpoint, so toggling an already-read item back to
  // unread is a no-op against the real backend (this matches the closest
  // available operation rather than fabricating one).
  const toggleRead = (id: string) => {
    const n = items.find((x) => x.id === id)
    if (n && !n.is_read) markReadMutation.mutate(id)
  }
  const dismiss = (id: string) => dismissMutation.mutate(id)
  const markAllRead = () => markAllReadMutation.mutate()

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    return items.filter((n) => n.type === tab)
  }, [items, tab])

  const grouped = useMemo(() => {
    const today: AppNotification[] = []
    const earlier: AppNotification[] = []
    for (const n of filtered) {
      ;(isToday(n.created_at) ? today : earlier).push(n)
    }
    return { today, earlier }
  }, [filtered])

  const unreadCount = items.filter((n) => !n.is_read).length

  const tabs = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { value: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { value: 'system', label: 'System', icon: Settings2 },
    { value: 'sent', label: 'Sent Broadcasts', icon: Send },
  ]

  return (
    <Layout>
      <PageHeader
        title="Notifications"
        subtitle="Alerts and broadcasts"
        actions={
          <>
            <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck size={16} /> Mark all read
            </Button>
            <BroadcastDialog />
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map((t) => {
            const Icon = t.icon
            const count = t.value === 'all' ? unreadCount : items.filter((n) => n.type === t.value && !n.is_read).length
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                <Icon size={14} /> {t.label}
                {count > 0 && (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--primary-foreground)]">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={tab}>
          {isError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl p-3 text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load notifications. Please try again.
            </div>
          )}
          {tab === 'sent' ? (
            isLoadingBroadcasts ? (
              <div className="flex items-center justify-center py-24">
                <LoadingSpinner size="lg" />
              </div>
            ) : sentBroadcasts.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
                  <Send size={28} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold text-[var(--foreground)]">No broadcasts sent yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your sent broadcasts will appear here.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {sentBroadcasts.map((b: any, i: number) => (
                      <SentBroadcastRow key={b.id} b={b} index={i} onDelete={(id) => deleteBroadcastMutation.mutate(id)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-24">
                <LoadingSpinner size="lg" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
                  <Bell size={28} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold text-[var(--foreground)]">You're all caught up</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">No notifications in this category.</p>
              </Card>
            ) : (
              <div className="space-y-6">
              {grouped.today.length > 0 && (
                <div>
                  <h3 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Today</h3>
                  <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                      {grouped.today.map((n, i) => (
                        <NotificationRow key={n.id} n={n} index={i} onToggleRead={toggleRead} onDismiss={dismiss} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {grouped.earlier.length > 0 && (
                <div>
                  <h3 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Earlier</h3>
                  <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                      {grouped.earlier.map((n, i) => (
                        <NotificationRow key={n.id} n={n} index={i} onToggleRead={toggleRead} onDismiss={dismiss} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  )
}
