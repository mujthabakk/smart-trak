import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftRight, Plus, Activity, CheckCircle2, Users,
  Bus as BusIcon, ArrowRight, Clock, ShieldCheck, AlertTriangle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { allBusTransfers, allBuses } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'
import type { BusTransfer as BusTransferType, TransferStatus } from '@/types'

const SCHOOL_ID = 'sch_001'

const TRANSFER_REASONS = [
  { value: 'breakdown', label: 'Bus Breakdown' },
  { value: 'road_closure', label: 'Road Closure' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'other', label: 'Other' },
]

const PROGRESS_BY_STATUS: Record<TransferStatus, number> = {
  initiated: 25,
  in_progress: 65,
  completed: 100,
}

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function BusChip({ label, tone }: { label: string; tone: 'from' | 'to' }) {
  const isFrom = tone === 'from'
  return (
    <div
      className={
        isFrom
          ? 'flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20'
          : 'flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/40 dark:bg-green-900/20'
      }
    >
      <div
        className={
          isFrom
            ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
            : 'flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
        }
      >
        <BusIcon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {isFrom ? 'From' : 'To'}
        </p>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{label}</p>
      </div>
    </div>
  )
}

function TransferRow({ transfer, index }: { transfer: BusTransferType; index: number }) {
  const progress = PROGRESS_BY_STATUS[transfer.status]
  return (
    <motion.div
      variants={item}
      className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
    >
      {/* timeline marker */}
      <div className="flex items-start gap-4">
        <div className="hidden flex-col items-center sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <ArrowLeftRight size={16} />
          </div>
          {index >= 0 && <div className="mt-1 w-px flex-1 bg-[var(--border)]" />}
        </div>

        <div className="min-w-0 flex-1">
          {/* From → To visualization */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <BusChip label={transfer.original_bus_number} tone="from" />
            </div>
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ x: -4, opacity: 0.4 }}
                animate={{ x: 4, opacity: 1 }}
                transition={{ duration: 1.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow"
              >
                <ArrowRight size={16} />
              </motion.div>
            </div>
            <div className="flex-1">
              <BusChip label={transfer.new_bus_number} tone="to" />
            </div>
          </div>

          {/* meta */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-[var(--primary)]" />
              <span className="font-semibold text-[var(--foreground)] tabular-nums">{transfer.affected_students}</span> students affected
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-[var(--primary)]" />
              {formatDate(transfer.transfer_at, 'datetime')}
            </span>
            {transfer.new_driver_name && (
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[var(--primary)]" />
                {transfer.new_driver_name}
              </span>
            )}
            <StatusBadge status={transfer.status} size="sm" className="ml-auto" />
          </div>

          <p className="mt-3 rounded-lg bg-[var(--muted)]/50 px-3 py-2 text-sm text-[var(--foreground)]">
            {transfer.reason}
          </p>

          {/* progress */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
              <span>Transfer progress</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function BusTransfer() {
  const buses = useMemo(() => allBuses.filter((b) => b.school_id === SCHOOL_ID), [])

  const [transfers, setTransfers] = useState<BusTransferType[]>(() =>
    allBusTransfers.filter((t) => t.school_id === SCHOOL_ID),
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const [fromBus, setFromBus] = useState('')
  const [toBus, setToBus] = useState('')
  const [reason, setReason] = useState(TRANSFER_REASONS[0].value)
  const [notes, setNotes] = useState('')
  const [notify, setNotify] = useState(true)

  const stats = useMemo(() => {
    const active = transfers.filter((t) => t.status !== 'completed').length
    const completedToday = transfers.filter((t) => {
      if (t.status !== 'completed') return false
      const d = new Date(t.transfer_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    const affected = transfers
      .filter((t) => t.status !== 'completed')
      .reduce((sum, t) => sum + t.affected_students, 0)
    return { active, completedToday, affected }
  }, [transfers])

  const sorted = useMemo(
    () => [...transfers].sort((a, b) => new Date(b.transfer_at).getTime() - new Date(a.transfer_at).getTime()),
    [transfers],
  )

  function resetForm() {
    setFromBus('')
    setToBus('')
    setReason(TRANSFER_REASONS[0].value)
    setNotes('')
    setNotify(true)
  }

  function submitTransfer() {
    const from = buses.find((b) => b.id === fromBus)
    const to = buses.find((b) => b.id === toBus)
    if (!from || !to || from.id === to.id) return
    const reasonLabel = TRANSFER_REASONS.find((r) => r.value === reason)?.label ?? 'Other'
    const newTransfer: BusTransferType = {
      id: `bt_${Date.now()}`,
      school_id: SCHOOL_ID,
      original_trip_id: from.current_trip_id ?? '',
      original_bus_id: from.id,
      original_bus_number: from.bus_number,
      new_bus_id: to.id,
      new_bus_number: to.bus_number,
      new_driver_id: to.driver_id,
      new_driver_name: to.driver_name,
      authorised_by: 'School Admin',
      transfer_at: new Date().toISOString(),
      status: 'initiated',
      reason: notes ? `${reasonLabel}: ${notes}` : reasonLabel,
      affected_students: from.seat_capacity ? Math.min(from.seat_capacity, 25) : 20,
    }
    setTransfers((prev) => [newTransfer, ...prev])
    resetForm()
    setDialogOpen(false)
  }

  const toBusOptions = buses.filter((b) => b.id !== fromBus)

  return (
    <Layout>
      <PageHeader
        title="Bus Transfer"
        subtitle="Handle breakdowns by reassigning students to another bus"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Initiate Transfer
          </Button>
        }
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard title="Active Transfers" value={stats.active} icon={Activity} color="info" subtitle="in progress now" />
          <StatsCard title="Completed Today" value={stats.completedToday} icon={CheckCircle2} color="success" />
          <StatsCard title="Affected Students" value={stats.affected} icon={Users} color="warning" subtitle="being reassigned" />
        </motion.div>

        <motion.div variants={item}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <ArrowLeftRight size={16} className="text-[var(--primary)]" />
            Transfer Timeline
          </h2>

          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={ArrowLeftRight}
                title="No transfers yet"
                description="When a bus breaks down or a route is disrupted, initiate a transfer to move students onto another bus."
                action={
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus size={16} /> Initiate Transfer
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((t, i) => (
                <TransferRow key={t.id} transfer={t} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Initiate transfer dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Initiate Bus Transfer
            </DialogTitle>
            <DialogDescription>Reassign students from one bus to another.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bt-from">From Bus</Label>
                <Select value={fromBus} onValueChange={setFromBus}>
                  <SelectTrigger id="bt-from">
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bus {b.bus_number}{b.driver_name ? ` · ${b.driver_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-to">To Bus</Label>
                <Select value={toBus} onValueChange={setToBus}>
                  <SelectTrigger id="bt-to">
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {toBusOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bus {b.bus_number}{b.driver_name ? ` · ${b.driver_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* live preview of the transfer */}
            {fromBus && toBus && (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {buses.find((b) => b.id === fromBus)?.bus_number}
                </span>
                <ArrowRight size={16} className="text-[var(--primary)]" />
                <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {buses.find((b) => b.id === toBus)?.bus_number}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bt-reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="bt-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFER_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bt-notes">Affected Route Info / Notes</Label>
              <Textarea
                id="bt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Location, route, and any details for the replacement driver…"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
              <div>
                <Label htmlFor="bt-notify" className="cursor-pointer">Notify Parents</Label>
                <p className="text-xs text-[var(--muted-foreground)]">Send an alert to affected parents.</p>
              </div>
              <Switch id="bt-notify" checked={notify} onCheckedChange={setNotify} />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitTransfer} disabled={!fromBus || !toBus || fromBus === toBus}>
              Initiate Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
