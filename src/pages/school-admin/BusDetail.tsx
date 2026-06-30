import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Pencil, ChevronDown, ChevronUp,
  Bus as BusIcon, Clock, Users, Navigation, User, MapPin,
  CheckCircle2,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
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
import { getInitials, formatDate, cn } from '@/lib/utils'

// ─── Animation variants ──────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── Mock data helpers ───────────────────────────────────────────────────────
const MOCK_DRIVER_PHONE = '+971 55 123 4567'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TODAY = toLocalDateStr(new Date())

// Mock students per location/stop
const MOCK_STOP_STUDENTS: { stop: string; type: 'pickup' | 'drop'; students: Array<{ id: string; name: string; class: string; pickupTime?: string; dropTime?: string; location: string; status: 'present' | 'absent' | 'pending' }> }[] = [
  {
    stop: 'Al Barsha Heights',
    type: 'pickup',
    students: [
      { id: 'std_001', name: 'Ahmed Hassan Al-Rashid', class: 'Class 5 - A', pickupTime: '7:15 AM', location: 'Al Barsha Heights', status: 'present' },
      { id: 'std_003', name: 'Mohammed Khalid Ibrahim', class: 'Class 7 - A', pickupTime: '7:15 AM', location: 'Al Barsha Heights', status: 'present' },
    ],
  },
  {
    stop: 'JLT Cluster T',
    type: 'pickup',
    students: [
      { id: 'std_005', name: 'Omar Abdullah Malik', class: 'Class 9 - A', pickupTime: '7:30 AM', location: 'JLT Cluster T', status: 'pending' },
      { id: 'std_007', name: 'Yousef Mahmoud Qassim', class: 'Class 4 - A', pickupTime: '7:30 AM', location: 'JLT Cluster T', status: 'absent' },
    ],
  },
  {
    stop: 'Al Barsha South 1',
    type: 'drop',
    students: [
      { id: 'std_002', name: 'Fatima Noor Al-Zahra', class: 'Class 3 - B', dropTime: '3:00 PM', location: 'Al Barsha South 1', status: 'present' },
      { id: 'std_008', name: 'Maryam Tariq Hussain', class: 'Class 8 - B', dropTime: '3:05 PM', location: 'Al Barsha South 1', status: 'pending' },
    ],
  },
]

const MOCK_SCHEDULE = [
  { id: 'sch1', label: 'Morning Trip', time: '7:00 AM – 8:30 AM', route: 'Route A - Pickup', students: 28, type: 'pickup', completedAt: '8:28 AM', duration: '88 min' },
  { id: 'sch2', label: 'Afternoon Trip', time: '2:30 PM – 3:45 PM', route: 'Route A - Drop', students: 25, type: 'drop', completedAt: '3:47 PM', duration: '77 min' },
]

// Mock history
function makeBusHistory(busId: string) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return { date: toLocalDateStr(d), dot: (i % 5 === 3 ? 'amber' : 'green') as 'green' | 'amber' }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ─── Accordion stop section ──────────────────────────────────────────────────
interface StopAccordionProps {
  stop: string
  type: 'pickup' | 'drop'
  students: typeof MOCK_STOP_STUDENTS[0]['students']
  defaultOpen?: boolean
  onStudentClick: (id: string) => void
}

function StopAccordion({ stop, type, students, defaultOpen = true, onStudentClick }: StopAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const presentCount = students.filter((s) => s.status === 'present').length

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} className={type === 'pickup' ? 'text-blue-500' : 'text-purple-500'} />
          <span className="font-semibold text-sm text-[var(--foreground)]">{stop}</span>
          <span className={cn(
            'text-[10px] font-semibold rounded-full px-2 py-0.5',
            type === 'pickup' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          )}>
            {type === 'pickup' ? 'Pickup' : 'Drop'}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">{presentCount}/{students.length}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
      </button>
      {open && (
        <div className="divide-y divide-[var(--border)]">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
                  {getInitials(s.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onStudentClick(s.id)}
                  className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] hover:underline transition-colors text-left"
                >
                  {s.name}
                </button>
                <p className="text-xs text-[var(--muted-foreground)]">{s.class}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {s.pickupTime && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                      <Clock size={10} /> Pickup: {s.pickupTime}
                    </span>
                  )}
                  {s.dropTime && (
                    <span className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400">
                      <Clock size={10} /> Drop: {s.dropTime}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                    <MapPin size={10} /> {s.location}
                  </span>
                </div>
              </div>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0',
                s.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : s.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              )}>
                {s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
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
function DetailRow({ label, value, danger, children }: { label: string; value?: string | number; danger?: boolean; children?: React.ReactNode }) {
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
  const [selectedDate, setSelectedDate] = useState(TODAY)

  const bus = allBuses.find((b) => b.id === id)
  const route = allRoutes.find((r) => r.bus_id === id)
  const dayMeta = useMemo(() => makeBusHistory(id ?? ''), [id])

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

        <motion.div variants={item} className="-mt-4">
          <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)] -ml-2" onClick={() => navigate('/school-admin/buses')}>
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

        {/* Horizontal Calendar */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-4 pb-3">
              <HorizontalCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                dayMeta={dayMeta}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            {/* ── Students tab — accordion by location ─────────────────── */}
            <TabsContent value="students" className="flex flex-col gap-3">
              <p className="text-xs text-[var(--muted-foreground)] px-1">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {MOCK_STOP_STUDENTS.map((group) => (
                <StopAccordion
                  key={group.stop}
                  stop={group.stop}
                  type={group.type}
                  students={group.students}
                  onStudentClick={(sid) => navigate(`/school-admin/students/${sid}`)}
                />
              ))}
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
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <span className="text-[var(--foreground)]">Completed at <strong>{trip.completedAt}</strong></span>
                      <span className="text-[var(--muted-foreground)] text-xs">({trip.duration})</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Details tab ──────────────────────────────────────────── */}
            <TabsContent value="details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Bus Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Bus Number" value={bus.bus_number} />
                    <DetailRow label="Make / Model" value={bus.make_model ?? '—'} />
                    <DetailRow label="Year" value={bus.year ?? '—'} />
                    <DetailRow label="Seat Capacity" value={bus.seat_capacity} />
                    <DetailRow
                      label="Insurance Expiry"
                      value={bus.insurance_expiry ? formatDate(bus.insurance_expiry, 'short') : '—'}
                      danger={isExpired(bus.insurance_expiry)}
                    />
                    <DetailRow
                      label="Fitness Cert Expiry"
                      value={bus.fitness_cert_expiry ? formatDate(bus.fitness_cert_expiry, 'short') : '—'}
                      danger={isExpired(bus.fitness_cert_expiry)}
                    />
                    {bus.safety_qr_code && (
                      <DetailRow label="QR Code" value={bus.safety_qr_code} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Driver &amp; Assignment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Driver Assigned">
                      {bus.driver_id ? (
                        <button
                          onClick={() => navigate(`/school-admin/drivers/${bus.driver_id}`)}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          {bus.driver_name ?? 'Unassigned'}
                        </button>
                      ) : <span className="text-sm text-[var(--muted-foreground)]">Unassigned</span>}
                    </DetailRow>
                    <DetailRow label="Driver Phone">
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium text-[var(--foreground)]">{MOCK_DRIVER_PHONE}</span>
                      </div>
                    </DetailRow>
                    <DetailRow label="Route">
                      {route ? (
                        <button
                          onClick={() => navigate(`/school-admin/routes/${route.id}`)}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          {route.name}
                        </button>
                      ) : <span className="text-sm text-[var(--muted-foreground)]">Unassigned</span>}
                    </DetailRow>
                    <DetailRow label="Route Type">
                      {route ? (
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          route.type === 'pickup'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                        )}>
                          {route.type === 'pickup' ? 'Pickup' : 'Drop'}
                        </span>
                      ) : '—'}
                    </DetailRow>
                    <DetailRow label="School" value="Al-Noor International School" />
                    <DetailRow label="Status">
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
            <DialogDescription>Contact the driver assigned to {bus.bus_number}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                {bus.driver_name ? getInitials(bus.driver_name) : 'NA'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-[var(--foreground)]">{bus.driver_name ?? 'Unassigned'}</p>
            <a href={`tel:${MOCK_DRIVER_PHONE.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-lg font-bold text-[var(--primary)] hover:underline">
              <Phone size={18} /> {MOCK_DRIVER_PHONE}
            </a>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>Close</Button>
            <a
              href={`tel:${MOCK_DRIVER_PHONE.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 h-9 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90"
            >
              <Phone size={15} /> Call Now
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit stub Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Bus</DialogTitle>
            <DialogDescription>Edit details for {bus.bus_number}. Use the Buses list page for full edit functionality.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setEditDialogOpen(false); navigate('/school-admin/buses') }}>Go to Buses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
