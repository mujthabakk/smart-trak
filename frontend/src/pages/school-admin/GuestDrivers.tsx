import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus, Plus, UserCheck, Route as RouteIcon, Phone,
  IdCard, Users, AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { listGuestTrips, createGuestTrip, updateGuestTrip } from '@/lib/api/guestTrips'
import { listStudents } from '@/lib/api/students'
import { formatDate, getInitials } from '@/lib/utils'
import type { GuestTripStatus } from '@/types'

const DOC_META: Record<string, { license: string; docsVerified: boolean }> = {
  gt_001: { license: 'DXB-G-90011', docsVerified: true },
  gt_002: { license: 'DXB-G-90012', docsVerified: false },
}
function docMeta(id: string) {
  return DOC_META[id] ?? { license: `DXB-G-${id.slice(-4).padStart(4, '0')}`, docsVerified: false }
}

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
      style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {message}
    </div>
  )
}

export default function GuestDrivers() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-trips'],
    queryFn: () => listGuestTrips({}),
  })
  const trips = useMemo(() => data?.trips ?? [], [data])

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents({ pageSize: 1000 }),
  })
  const students = useMemo(() => studentsData?.students ?? [], [studentsData])

  const [addOpen, setAddOpen] = useState(false)
  const [gName, setGName] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gReg, setGReg] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const stats = useMemo(() => ({
    total: trips.length,
    active: trips.filter((t) => t.status === 'approved' && t.started_at && !t.ended_at).length,
    completed: trips.filter((t) => t.status === 'completed').length,
  }), [trips])

  const createMutation = useMutation({
    mutationFn: createGuestTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-trips'] })
      resetAdd()
      setAddOpen(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GuestTripStatus }) => updateGuestTrip(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-trips'] })
    },
  })

  function resetAdd() {
    setGName('')
    setGPhone('')
    setGReg('')
    setSelectedStudentIds([])
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submitAdd() {
    if (!gName || !gPhone || !gReg) return
    createMutation.mutate({
      guest_driver_name: gName,
      guest_driver_phone: gPhone,
      bus_registration: gReg,
      student_ids: selectedStudentIds,
    })
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
          {isError && <ErrorBanner message="Failed to load guest drivers. Please try again." />}

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : trips.length === 0 ? (
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

                    {/* Status + Added date */}
                    <div className="min-w-0">
                      <StatusBadge status={trip.status} size="sm" />
                      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Added</p>
                      <p className="text-xs text-[var(--foreground)]">
                        {formatDate(trip.created_at, 'datetime')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {trip.status === 'pending_approval' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'approved' })}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'rejected' })}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </>
                      )}
                      {trip.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'completed' })}
                        >
                          <UserCheck size={14} /> Mark Completed
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
            {createMutation.isError && <ErrorBanner message="Failed to add the guest driver. Please try again." />}
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

            <div className="space-y-1.5">
              <Label>Assign Students</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                {students.length === 0 ? (
                  <p className="p-2 text-xs text-[var(--muted-foreground)]">No students available.</p>
                ) : (
                  students.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--muted)]/50"
                    >
                      <Checkbox
                        checked={selectedStudentIds.includes(s.id)}
                        onCheckedChange={() => toggleStudent(s.id)}
                      />
                      <span className="text-[var(--foreground)]">{s.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">Class {s.class}{s.division}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitAdd} disabled={!gName || !gPhone || !gReg} loading={createMutation.isPending}>
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
