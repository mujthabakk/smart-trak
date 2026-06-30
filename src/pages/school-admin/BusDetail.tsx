import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Pencil, ChevronDown, ChevronUp,
  Bus as BusIcon, Clock, Users, Navigation, User,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allBuses, allRoutes } from '@/lib/mockData'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Animation variants ──────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── Mock data for this detail page ─────────────────────────────────────────
const MOCK_DRIVER_PHONE = '+971 55 123 4567'

const MOCK_ON_BOARD = [
  { id: 's1', name: 'Ahmed Hassan Al-Rashid', classDiv: 'Class 5 - A' },
  { id: 's2', name: 'Mohammed Khalid Ibrahim', classDiv: 'Class 7 - A' },
  { id: 's3', name: 'Yousef Mahmoud Qassim', classDiv: 'Class 4 - A' },
  { id: 's4', name: 'Omar Abdullah Malik', classDiv: 'Class 9 - A' },
]

const MOCK_ABSENT = [
  { id: 's5', name: 'Sara Ali Hassan', classDiv: 'Class 6 - B' },
  { id: 's6', name: 'Maryam Tariq Hussain', classDiv: 'Class 8 - B' },
]

const MOCK_YET_TO_BOARD = [
  { id: 's7', name: 'Fatima Noor Al-Zahra', classDiv: 'Class 3 - B' },
  { id: 's8', name: 'Aisha Rahman Siddiqui', classDiv: 'Class 2 - C' },
]

const MOCK_SCHEDULE = [
  {
    id: 'sch1',
    label: 'Morning Trip',
    time: '7:00 AM – 8:30 AM',
    route: 'Route A - Pickup',
    students: 28,
    type: 'pickup',
  },
  {
    id: 'sch2',
    label: 'Afternoon Trip',
    time: '2:30 PM – 3:45 PM',
    route: 'Route A - Drop',
    students: 25,
    type: 'drop',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Collapsible section ──────────────────────────────────────────────────────
interface CollapsibleSectionProps {
  title: string
  count: number
  accentColor: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  title, count, accentColor, defaultOpen = true, children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--foreground)]">{title}</span>
          <span
            className={cn(
              'inline-flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5',
              accentColor,
            )}
          >
            {count}
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
        )}
      </button>
      {open && (
        <div className="divide-y divide-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Student row ──────────────────────────────────────────────────────────────
interface StudentRowProps {
  name: string
  classDiv: string
  status: 'present' | 'absent' | 'pending'
}

const STATUS_BADGE_CLASSES: Record<StudentRowProps['status'], string> = {
  present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const STATUS_LABELS: Record<StudentRowProps['status'], string> = {
  present: 'Present',
  absent: 'Absent',
  pending: 'Yet to Board',
}

function StudentRow({ name, classDiv, status }: StudentRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarFallback className="text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{classDiv}</p>
      </div>
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0',
          STATUS_BADGE_CLASSES[status],
        )}
      >
        {STATUS_LABELS[status]}
      </span>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
          <p className="text-lg font-bold text-[var(--foreground)] truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Detail row ───────────────────────────────────────────────────────────────
interface DetailRowProps {
  label: string
  value?: string | number
  danger?: boolean
  children?: React.ReactNode
}

function DetailRow({ label, value, danger, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      {children ?? (
        <span className={cn('text-sm font-medium', danger ? 'text-red-600 dark:text-red-400' : 'text-[var(--foreground)]')}>
          {value ?? '—'}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BusDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const bus = allBuses.find((b) => b.id === id)
  const route = allRoutes.find((r) => r.bus_id === id)

  // Deterministic occupancy (same logic as Buses.tsx)
  function occupancyFor(): number {
    if (!bus) return 0
    if (bus.status === 'offline' || !bus.status) return 0
    const seed = bus.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return Math.min(bus.seat_capacity, 18 + (seed % Math.max(1, bus.seat_capacity - 18)))
  }

  if (!bus) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <BusIcon size={48} className="text-[var(--muted-foreground)]" />
          <p className="text-lg font-semibold text-[var(--foreground)]">Bus not found</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            The bus you are looking for does not exist or has been removed.
          </p>
          <Button onClick={() => navigate('/school-admin/buses')}>
            <ArrowLeft size={16} /> Back to Buses
          </Button>
        </div>
      </Layout>
    )
  }

  const occupancy = occupancyFor()
  const status = bus.status ?? 'offline'

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">

        {/* Header */}
        <motion.div variants={item}>
          <PageHeader
            title={bus.bus_number}
            subtitle={bus.make_model ?? 'Vehicle'}
            breadcrumbs={[
              { label: 'Buses', path: '/school-admin/buses' },
              { label: bus.bus_number },
            ]}
            actions={
              <>
                <StatusBadge status={status} />
                <Button variant="outline" size="sm" onClick={() => setCallDialogOpen(true)}>
                  <Phone size={15} /> Call Driver
                </Button>
                <Button size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Pencil size={15} /> Edit Bus
                </Button>
              </>
            }
          />
        </motion.div>

        {/* Back button row */}
        <motion.div variants={item} className="-mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] -ml-2"
            onClick={() => navigate('/school-admin/buses')}
          >
            <ArrowLeft size={15} /> Back to Buses
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Seat Capacity" value={bus.seat_capacity} />
          <StatCard icon={Users} label="Occupancy" value={`${occupancy} / ${bus.seat_capacity}`} />
          <StatCard icon={Navigation} label="Route" value={route?.name ?? 'Unassigned'} />
          <StatCard icon={User} label="Driver" value={bus.driver_name ?? 'Unassigned'} />
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* ── Students tab ────────────────────────────────────────── */}
            <TabsContent value="students" className="flex flex-col gap-4">
              <CollapsibleSection
                title="On Board / Present"
                count={MOCK_ON_BOARD.length}
                accentColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                {MOCK_ON_BOARD.map((s) => (
                  <StudentRow key={s.id} name={s.name} classDiv={s.classDiv} status="present" />
                ))}
              </CollapsibleSection>

              <CollapsibleSection
                title="Absent Today"
                count={MOCK_ABSENT.length}
                accentColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                {MOCK_ABSENT.map((s) => (
                  <StudentRow key={s.id} name={s.name} classDiv={s.classDiv} status="absent" />
                ))}
              </CollapsibleSection>

              <CollapsibleSection
                title="Yet to Board"
                count={MOCK_YET_TO_BOARD.length}
                accentColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {MOCK_YET_TO_BOARD.map((s) => (
                  <StudentRow key={s.id} name={s.name} classDiv={s.classDiv} status="pending" />
                ))}
              </CollapsibleSection>
            </TabsContent>

            {/* ── Schedule tab ─────────────────────────────────────────── */}
            <TabsContent value="schedule" className="flex flex-col gap-4">
              {MOCK_SCHEDULE.map((trip) => (
                <Card key={trip.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-[var(--primary)]" />
                      </div>
                      {trip.label}
                      <Badge
                        variant="secondary"
                        className={cn(
                          'ml-auto text-xs',
                          trip.type === 'pickup'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                        )}
                      >
                        {trip.type === 'pickup' ? 'Pickup' : 'Drop'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Clock size={14} className="text-[var(--muted-foreground)]" />
                      <span>{trip.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Navigation size={14} className="text-[var(--muted-foreground)]" />
                      <span>{trip.route}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Users size={14} className="text-[var(--muted-foreground)]" />
                      <span>{trip.students} students</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Details tab ──────────────────────────────────────────── */}
            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bus info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                      Bus Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Bus Number" value={bus.bus_number} />
                    <DetailRow label="Make / Model" value={bus.make_model ?? '—'} />
                    <DetailRow label="Year" value={bus.year ?? '—'} />
                    <DetailRow label="Seat Capacity" value={bus.seat_capacity} />
                    <DetailRow
                      label="Insurance Expiry"
                      value={formatDate(bus.insurance_expiry)}
                      danger={isExpired(bus.insurance_expiry)}
                    />
                    <DetailRow
                      label="Fitness Cert Expiry"
                      value={formatDate(bus.fitness_cert_expiry)}
                      danger={isExpired(bus.fitness_cert_expiry)}
                    />
                    {bus.safety_qr_code && (
                      <DetailRow label="QR Code" value={bus.safety_qr_code} />
                    )}
                  </CardContent>
                </Card>

                {/* Driver & assignment info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                      Driver &amp; Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Driver Assigned" value={bus.driver_name ?? 'Unassigned'} />
                    <DetailRow label="Driver Phone">
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {MOCK_DRIVER_PHONE}
                        </span>
                      </div>
                    </DetailRow>
                    <DetailRow label="Route" value={route?.name ?? 'Unassigned'} />
                    <DetailRow label="School" value="Al-Noor International School" />
                    <DetailRow label="Registration" value={bus.bus_number} />
                    <DetailRow
                      label="Status"
                    >
                      <StatusBadge status={status} size="sm" />
                    </DetailRow>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Call Driver Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone size={18} className="text-[var(--primary)]" />
              Call Driver
            </DialogTitle>
            <DialogDescription>
              Contact the driver assigned to {bus.bus_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                {bus.driver_name ? getInitials(bus.driver_name) : 'NA'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-[var(--foreground)]">{bus.driver_name ?? 'Unassigned'}</p>
            <a
              href={`tel:${MOCK_DRIVER_PHONE.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 text-lg font-bold text-[var(--primary)] hover:underline"
            >
              <Phone size={18} />
              {MOCK_DRIVER_PHONE}
            </a>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={`tel:${MOCK_DRIVER_PHONE.replace(/\s/g, '')}`}>
                <Phone size={15} /> Call Now
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit stub Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Bus</DialogTitle>
            <DialogDescription>
              Edit details for {bus.bus_number}. Use the Buses list page for full edit functionality.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                setEditDialogOpen(false)
                navigate('/school-admin/buses')
              }}
            >
              Go to Buses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
