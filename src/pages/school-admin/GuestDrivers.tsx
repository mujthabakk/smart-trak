import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserPlus, Plus, UserCheck, Route as RouteIcon, Phone,
  IdCard, Users,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { allGuestTrips } from '@/lib/mockData'
import { formatDate, getInitials } from '@/lib/utils'
import type { GuestTrip } from '@/types'

const SCHOOL_ID = 'sch_001'

const DOC_META: Record<string, { license: string; docsVerified: boolean }> = {
  gt_001: { license: 'DXB-G-90011', docsVerified: true },
  gt_002: { license: 'DXB-G-90012', docsVerified: false },
}
function docMeta(id: string) {
  return DOC_META[id] ?? { license: `DXB-G-${id.slice(-4).padStart(4, '0')}`, docsVerified: false }
}

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function GuestDrivers() {
  const [trips, setTrips] = useState<GuestTrip[]>(() =>
    allGuestTrips.filter((t) => t.school_id === SCHOOL_ID).map((t) => ({ ...t, status: 'approved' as const })),
  )

  const [addOpen, setAddOpen] = useState(false)
  const [gName, setGName] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gReg, setGReg] = useState('')

  const stats = useMemo(() => ({
    total: trips.length,
    active: trips.filter((t) => t.status === 'approved' && t.started_at && !t.ended_at).length,
    completed: trips.filter((t) => t.status === 'completed').length,
  }), [trips])

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
      status: 'approved',
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
        subtitle="Manage temporary drivers for your school"
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
          <StatsCard title="Total Drivers" value={stats.total} icon={UserPlus} color="info" />
          <StatsCard title="Active Trips" value={stats.active} icon={RouteIcon} color="success" subtitle="on the road" />
          <StatsCard title="Completed" value={stats.completed} icon={UserCheck} color="primary" />
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          {trips.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={UserPlus}
                title="No guest drivers"
                description="Temporary drivers will appear here. Add a guest driver to get started."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus size={16} /> Add Guest Driver
                  </Button>
                }
              />
            </div>
          ) : (
            trips.map((trip) => {
              const meta = docMeta(trip.id)
              return (
                <motion.div
                  key={trip.id}
                  variants={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
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

                    {/* License */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <IdCard size={13} className="text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)]">{meta.license}</span>
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

                    {/* Added date */}
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Added</p>
                      <p className="text-xs text-[var(--foreground)]">
                        {formatDate(trip.created_at, 'datetime')}
                      </p>
                    </div>

                    {/* Actions placeholder */}
                    <div className="flex items-center gap-2" />
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </motion.div>

      {/* Add guest driver dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-[var(--primary)]" /> Add Guest Driver
            </DialogTitle>
            <DialogDescription>Register a temporary driver for your school.</DialogDescription>
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
