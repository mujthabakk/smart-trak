import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserPlus, Plus, Clock, UserCheck, Route as RouteIcon, Phone,
  FileText, Check, X, ShieldCheck, IdCard, Users,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { allGuestTrips } from '@/lib/mockData'
import { formatDate, getInitials } from '@/lib/utils'
import type { GuestTrip, GuestTripStatus } from '@/types'

const SCHOOL_ID = 'sch_001'

// Document-verification metadata keyed by guest trip id (derived — not on the type).
const DOC_META: Record<string, { license: string; docsVerified: boolean }> = {
  gt_001: { license: 'DXB-G-90011', docsVerified: true },
  gt_002: { license: 'DXB-G-90012', docsVerified: false },
}
function docMeta(id: string) {
  return DOC_META[id] ?? { license: `DXB-G-${id.slice(-4).padStart(4, '0')}`, docsVerified: false }
}

const CHECKLIST = [
  { key: 'license', label: 'Driving licence verified' },
  { key: 'background', label: 'Background check cleared' },
  { key: 'id', label: 'Government ID confirmed' },
]

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function GuestDrivers() {
  const [trips, setTrips] = useState<GuestTrip[]>(() =>
    allGuestTrips.filter((t) => t.school_id === SCHOOL_ID),
  )

  // approval dialog state
  const [approving, setApproving] = useState<GuestTrip | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  // add-guest dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [gName, setGName] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gReg, setGReg] = useState('')

  const stats = useMemo(() => ({
    pending: trips.filter((t) => t.status === 'pending_approval').length,
    approved: trips.filter((t) => t.status === 'approved').length,
    active: trips.filter((t) => t.status === 'approved' && t.started_at && !t.ended_at).length,
  }), [trips])

  const sorted = useMemo(() => {
    const rank: Record<GuestTripStatus, number> = {
      pending_approval: 0,
      approved: 1,
      completed: 2,
      rejected: 3,
    }
    return [...trips].sort((a, b) => rank[a.status] - rank[b.status])
  }, [trips])

  const allChecked = CHECKLIST.every((c) => checks[c.key])

  function openApproval(trip: GuestTrip) {
    setApproving(trip)
    setChecks({})
  }

  function confirmApproval() {
    if (!approving || !allChecked) return
    setTrips((prev) =>
      prev.map((t) =>
        t.id === approving.id ? { ...t, status: 'approved', approved_by: 'School Admin' } : t,
      ),
    )
    setApproving(null)
    setChecks({})
  }

  function reject(id: string) {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'rejected', approved_by: 'School Admin' } : t)))
    if (approving?.id === id) setApproving(null)
  }

  function resetAdd() {
    setGName('')
    setGPhone('')
    setGReg('')
  }

  function submitAdd() {
    if (!gName || !gPhone || !gReg) return
    const newTrip: GuestTrip = {
      id: `gt_${Date.now()}`,
      school_id: SCHOOL_ID,
      guest_driver_name: gName,
      guest_driver_phone: gPhone,
      bus_registration: gReg,
      status: 'pending_approval',
      students: [],
      created_at: new Date().toISOString(),
    }
    setTrips((prev) => [newTrip, ...prev])
    resetAdd()
    setAddOpen(false)
  }

  return (
    <Layout>
      <PageHeader
        title="Guest Drivers"
        subtitle="Approve temporary drivers and verify their documents"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Guest Driver
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
          <StatsCard title="Pending Approval" value={stats.pending} icon={Clock} color="warning" subtitle="needs review" />
          <StatsCard title="Approved" value={stats.approved} icon={UserCheck} color="success" />
          <StatsCard title="Active Trips" value={stats.active} icon={RouteIcon} color="info" subtitle="on the road" />
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={UserPlus}
                title="No guest drivers"
                description="Temporary drivers awaiting approval will appear here. Add a guest driver to begin verification."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus size={16} /> Add Guest Driver
                  </Button>
                }
              />
            </div>
          ) : (
            sorted.map((trip) => {
              const meta = docMeta(trip.id)
              const isPending = trip.status === 'pending_approval'
              return (
                <motion.div
                  key={trip.id}
                  variants={item}
                  className={
                    isPending
                      ? 'rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/10'
                      : 'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm'
                  }
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Driver */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarFallback className="bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                          {getInitials(trip.guest_driver_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{trip.guest_driver_name}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Phone size={11} /> {trip.guest_driver_phone}
                        </p>
                      </div>
                    </div>

                    {/* License + docs */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <IdCard size={13} className="text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)]">{meta.license}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs">
                        <FileText size={13} className={meta.docsVerified ? 'text-green-600' : 'text-amber-600'} />
                        <span className={meta.docsVerified ? 'text-green-600' : 'text-amber-600'}>
                          {meta.docsVerified ? 'Documents verified' : 'Documents pending'}
                        </span>
                      </p>
                    </div>

                    {/* Assigned trip */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <RouteIcon size={13} className="text-[var(--primary)]" />
                        Bus {trip.bus_registration}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <Users size={13} className="text-[var(--primary)]" />
                        {trip.students.length} student{trip.students.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    {/* Valid period */}
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Valid Period</p>
                      <p className="text-xs text-[var(--foreground)]">
                        {trip.started_at ? formatDate(trip.started_at, 'datetime') : formatDate(trip.created_at, 'datetime')}
                      </p>
                      {trip.ended_at && (
                        <p className="text-xs text-[var(--muted-foreground)]">→ {formatDate(trip.ended_at, 'time')}</p>
                      )}
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={trip.status} size="sm" />
                      {isPending ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => openApproval(trip)}
                          >
                            <Check size={14} /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => reject(trip.id)}
                          >
                            <X size={14} /> Reject
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <FileText size={14} /> Documents
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </motion.div>

      {/* Approval dialog with document checklist */}
      <Dialog open={approving !== null} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-600" /> Verify & Approve
            </DialogTitle>
            <DialogDescription>
              Confirm all documents for {approving?.guest_driver_name} before approving this guest driver.
            </DialogDescription>
          </DialogHeader>

          {approving && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                    {getInitials(approving.guest_driver_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{approving.guest_driver_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Licence {docMeta(approving.id).license} · Bus {approving.bus_registration}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Document Checklist
                </p>
                {CHECKLIST.map((c) => (
                  <label
                    key={c.key}
                    htmlFor={`chk-${c.key}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 transition-colors hover:bg-[var(--muted)]/40"
                  >
                    <Checkbox
                      id={`chk-${c.key}`}
                      checked={!!checks[c.key]}
                      onCheckedChange={(v) => setChecks((prev) => ({ ...prev, [c.key]: v === true }))}
                    />
                    <span className="text-sm text-[var(--foreground)]">{c.label}</span>
                  </label>
                ))}
              </div>

              {!allChecked && (
                <p className="text-xs text-amber-600">All items must be checked before approval.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => approving && reject(approving.id)}
            >
              <X size={14} /> Reject
            </Button>
            <Button onClick={confirmApproval} disabled={!allChecked} className="bg-green-600 text-white hover:bg-green-700">
              <Check size={14} /> Approve Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add guest driver dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-[var(--primary)]" /> Add Guest Driver
            </DialogTitle>
            <DialogDescription>Register a temporary driver for approval.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="gd-name">Driver Name</Label>
              <Input id="gd-name" value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gd-phone">Phone</Label>
                <Input id="gd-phone" value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="+971…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gd-reg">Bus Registration</Label>
                <Input id="gd-reg" value={gReg} onChange={(e) => setGReg(e.target.value)} placeholder="DXB-A-12345" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitAdd} disabled={!gName || !gPhone || !gReg}>
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
