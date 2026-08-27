import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Pencil, ChevronDown, ChevronUp,
  Bus as BusIcon, Clock, Users, Navigation, User, MapPin,
  CheckCircle2, CalendarCheck, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Route, Student, AttendanceRecord, Trip } from '@/types'
import { getInitials, formatDate, cn } from '@/lib/utils'
import { getBusTripDurationDisplay, getTripDurationDisplay } from '@/lib/tripDuration'
import { getBus, getBusLocation } from '@/lib/api/buses'
import { listRoutes } from '@/lib/api/routes'
import { listStudents } from '@/lib/api/students'
import { listTrips } from '@/lib/api/trips'
import { listAttendance } from '@/lib/api/attendance'
import { listDrivers } from '@/lib/api/drivers'
import { useAppSelector } from '@/store/hooks'
import { getSocket } from '@/lib/socket'

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Failed to load bus details.'
  }
  return 'Failed to load bus details.'
}

// ─── Animation variants ──────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TODAY = toLocalDateStr(new Date())

type StudentStopStatus = 'present' | 'absent' | 'pending'

interface StopStudent {
  id: string
  name: string
  class: string
  pickupTime?: string
  dropTime?: string
  location: string
  status: StudentStopStatus
}

interface StopGroup {
  stop_id?: string
  stop: string
  type: 'pickup' | 'drop'
  estimatedTime?: string
  students: StopStudent[]
}

function attendanceStatusForStudent(studentId: string, attendance: AttendanceRecord[]): StudentStopStatus {
  const record = attendance.find((a) => a.student_id === studentId)
  if (!record) return 'pending'
  if (record.status === 'present') return 'present'
  if (record.status === 'absent' || record.status === 'leave') return 'absent'
  return 'pending'
}

function buildStopGroups(route: Route | undefined, type: 'pickup' | 'drop', allStudents: Student[], attendance: AttendanceRecord[]): StopGroup[] {
  if (!route) return []
  const students = allStudents.filter((s) => s.route_name === route.name)
  let stops = [...(route.stops ?? [])].sort((a, b) => a.order_index - b.order_index)
  if (type === 'drop') {
    stops = stops.reverse()
  }
  if (stops.length === 0) return []

  const groups: StopGroup[] = stops.map((stop) => ({
    stop_id: stop.id, // Store stop ID to map students correctly
    stop: stop.name,
    type,
    estimatedTime: stop.estimated_time,
    students: [],
  }))

  students.forEach((student) => {
    // Find the correct stop group for this student based on trip type
    const targetStopId = type === 'pickup' ? student.pickup_stop_id : student.drop_stop_id
    const group = groups.find(g => g.stop_id === targetStopId) || groups[0] // fallback if not found

    if (group) {
      group.students.push({
        id: student.id,
        name: student.name,
        class: `Class ${student.class} - ${student.division}`,
        location: group.stop,
        pickupTime: type === 'pickup' ? group.estimatedTime : undefined,
        dropTime: type === 'drop' ? group.estimatedTime : undefined,
        status: attendanceStatusForStudent(student.id, attendance),
      })
    }
  })

  return groups
}

function countAttendance(students: Student[], attendance: AttendanceRecord[]): { onboarded: number; notYet: number; absent: number; total: number } {
  let onboarded = 0
  let notYet = 0
  let absent = 0
  for (const s of students) {
    const status = attendanceStatusForStudent(s.id, attendance)
    if (status === 'present') onboarded++
    else if (status === 'absent') absent++
    else notYet++
  }
  return { onboarded, notYet, absent, total: students.length }
}

interface ScheduleEntry {
  id: string
  label: string
  time: string
  route: string
  type: 'pickup' | 'drop'
  completedAt?: string
  duration: string
  isLive: boolean
}

function buildSchedule(trips: Trip[]): ScheduleEntry[] {
  return [...trips]
    .filter((t) => t.started_at)
    .sort((a, b) => new Date(b.started_at!).getTime() - new Date(a.started_at!).getTime())
    .slice(0, 5)
    .map((t) => {
      const duration = getTripDurationDisplay(t)
      return {
        id: t.id,
        label: t.trip_type === 'pickup' ? 'Pickup Trip' : 'Drop Trip',
        time: t.ended_at
          ? `${formatDate(t.started_at!, 'time')} – ${formatDate(t.ended_at, 'time')}`
          : `${formatDate(t.started_at!, 'time')} – in progress`,
        route: t.route_name,
        type: t.trip_type,
        completedAt: t.ended_at ? formatDate(t.ended_at, 'time') : undefined,
        duration: duration.label,
        isLive: duration.isLive,
      }
    })
}

/** Buckets a day's attendance records (for this bus's students) into a calendar dot. */
function dayAttendanceDot(records: AttendanceRecord[], studentIds: Set<string>): 'green' | 'amber' | 'none' {
  const relevant = records.filter((r) => studentIds.has(r.student_id))
  if (relevant.length === 0) return 'none'
  const hasAbsence = relevant.some((r) => r.status === 'absent' || r.status === 'leave')
  return hasAbsence ? 'amber' : 'green'
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
  students: StopStudent[]
  defaultOpen?: boolean
  onStudentClick: (id: string) => void
}

function StopAccordion({ stop, type, students, defaultOpen = true, onStudentClick }: StopAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const presentCount = students.filter((s) => s.status === 'present').length
  const notYetCount = students.filter((s) => s.status === 'pending').length
  const absentCount = students.filter((s) => s.status === 'absent').length

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={14} className={type === 'pickup' ? 'text-blue-500' : 'text-purple-500'} />
          <div className="min-w-0 text-left">
            <span className="font-semibold text-sm text-[var(--foreground)] block truncate">{stop}</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">Location / Stop</span>
          </div>
          <span className={cn(
            'text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0',
            type === 'pickup' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          )}>
            {type === 'pickup' ? 'Pickup' : 'Drop'}
          </span>
          <Badge variant="secondary" className="text-[10px] tabular-nums flex-shrink-0">
            {presentCount}/{students.length}
          </Badge>
          <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums flex-shrink-0">
            {presentCount} on · {notYetCount} wait · {absentCount} abs
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-[var(--muted-foreground)] flex-shrink-0" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)] flex-shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-[var(--border)]">
          {students.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--muted-foreground)]">No students at this location</p>
          ) : (
            students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onStudentClick(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]/30 transition-colors cursor-pointer"
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
                    {getInitials(s.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{s.class}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
                  {s.status === 'present' ? 'Onboarded' : s.status === 'absent' ? 'Absent' : 'Not yet'}
                </span>
              </button>
            ))
          )}
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
  const user = useAppSelector((state) => state.auth.user)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const queryClient = useQueryClient()

  // Live attendance updates via WebSockets
  useEffect(() => {
    const socket = getSocket()
    
    function handleAttendanceUpdate() {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    }

    socket.on('attendance:updated', handleAttendanceUpdate)
    return () => {
      socket.off('attendance:updated', handleAttendanceUpdate)
    }
  }, [queryClient])

  const { data: bus, isLoading, isError, error } = useQuery({
    queryKey: ['bus', id],
    queryFn: () => getBus(id as string),
    enabled: !!id,
  })

  const { data: location } = useQuery({
    queryKey: ['bus', id, 'location'],
    queryFn: () => getBusLocation(id as string),
    enabled: !!id,
    refetchInterval: 10000,
  })

  const { data: routesData } = useQuery({
    queryKey: ['routes', 'bus', id],
    queryFn: () => listRoutes({ bus_id: id }),
    enabled: !!id,
  })
  const busRoutes = useMemo(() => routesData?.routes ?? [], [routesData])

  const { data: allRoutesData } = useQuery({
    queryKey: ['routes'],
    queryFn: () => listRoutes(),
  })
  const allRoutes = useMemo(() => allRoutesData?.routes ?? [], [allRoutesData])

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents({ pageSize: 1000 }),
  })
  const students = useMemo(() => studentsData?.students ?? [], [studentsData])

  const { data: tripsData } = useQuery({
    queryKey: ['trips', 'bus', id],
    queryFn: () => listTrips({ bus_id: id }),
    enabled: !!id,
  })
  const trips = useMemo(() => tripsData?.trips ?? [], [tripsData])

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => listAttendance({ date: selectedDate, pageSize: 1000 }),
    staleTime: 0,
  })
  const attendance = useMemo(() => attendanceData?.records ?? [], [attendanceData])

  const { data: driversData } = useQuery({ queryKey: ['drivers'], queryFn: () => listDrivers() })
  const driver = useMemo(
    () => driversData?.drivers.find((d) => d.id === bus?.driver_id),
    [driversData, bus?.driver_id],
  )

  const last14Days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i)
      return toLocalDateStr(d)
    }),
    [],
  )
  const { data: historyRecordsByDay } = useQuery({
    queryKey: ['attendance', 'bus-history', id, last14Days],
    queryFn: () => Promise.all(last14Days.map((date) => listAttendance({ date, pageSize: 1000 }))),
    enabled: !!id,
  })

  const route = useMemo(() => {
    if (busRoutes.length > 0) return busRoutes[0]
    if (trips.length > 0) return allRoutes.find((r) => r.id === trips[0].route_id)
    return undefined
  }, [busRoutes, trips, allRoutes])

  const allBusStudents = useMemo(
    () => (route ? students.filter((s) => s.route_name === route.name) : []),
    [route, students],
  )

  const busAttendance = useMemo(() => countAttendance(allBusStudents, attendance), [allBusStudents, attendance])
  const tripDuration = useMemo(() => (id ? getBusTripDurationDisplay(id, trips) : null), [id, trips])

  const stopGroups = useMemo(
    () => [...buildStopGroups(route, 'pickup', students, attendance), ...buildStopGroups(route, 'drop', students, attendance)],
    [route, students, attendance],
  )

  const busStudentIds = useMemo(() => new Set(allBusStudents.map((s) => s.id)), [allBusStudents])
  const dayMeta = useMemo(() => {
    if (!historyRecordsByDay) return []
    return last14Days.map((date, i) => ({
      date,
      dot: dayAttendanceDot(historyRecordsByDay[i]?.records ?? [], busStudentIds),
    }))
  }, [historyRecordsByDay, last14Days, busStudentIds])

  const schedule = useMemo(() => buildSchedule(trips), [trips])

  function occupancyFor(): number {
    if (!bus) return 0
    if (bus.status === 'offline' || !bus.status) return 0
    const seed = bus.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return Math.min(bus.seat_capacity, 18 + (seed % Math.max(1, bus.seat_capacity - 18)))
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <AlertCircle size={48} className="text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{extractErrorMessage(error)}</p>
          <Button onClick={() => navigate('/school-admin/buses')}>
            <ArrowLeft size={16} /> Back to Buses
          </Button>
        </div>
      </Layout>
    )
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
                {location && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <MapPin size={12} /> {location.current_stop ?? 'En route'} · {Math.round(location.speed)} km/h
                  </span>
                )}
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
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Seat Capacity" value={bus.seat_capacity} />
          <StatCard icon={Users} label="Occupancy" value={`${occupancy} / ${bus.seat_capacity}`} />
          <StatCard
            icon={Clock}
            label={tripDuration?.isLive ? 'Trip Time (Live)' : 'Last Trip'}
            value={tripDuration ? tripDuration.label : '—'}
          />
          <StatCard icon={CalendarCheck} label="Onboarded" value={`${busAttendance.onboarded}/${busAttendance.total}`} />
          <StatCard icon={Navigation} label="Route" value={route?.name ?? 'Unassigned'} />
          <StatCard icon={User} label="Driver" value={bus.driver_name ?? 'Unassigned'} />
        </motion.div>

        {/* Student attendance breakdown */}
        {busAttendance.total > 0 && (
          <motion.div variants={item} className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 text-xs font-semibold tabular-nums">
              {busAttendance.onboarded} onboarded
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 text-xs font-semibold tabular-nums">
              {busAttendance.notYet} not yet
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 text-xs font-semibold tabular-nums">
              {busAttendance.absent} absent
            </span>
          </motion.div>
        )}

        {/* Route attendance summary */}
        {route && (
          <motion.div variants={item} className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/school-admin/routes/${route.id}`)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:border-[var(--primary)]/40 transition-colors"
            >
              <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0">Route</Badge>
              <span className="font-medium text-[var(--foreground)]">{route.name}</span>
              <span className="tabular-nums font-bold text-[var(--primary)]">{busAttendance.onboarded}/{busAttendance.total}</span>
            </button>
          </motion.div>
        )}

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
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs font-semibold text-[var(--foreground)] tabular-nums">
                  Today: {busAttendance.onboarded}/{busAttendance.total} onboarded
                  {' · '}{busAttendance.notYet} not yet · {busAttendance.absent} absent
                </p>
              </div>
              {stopGroups.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No route stops assigned to this bus yet.
                  </CardContent>
                </Card>
              ) : (
                stopGroups.map((group) => (
                  <StopAccordion
                    key={`${group.type}-${group.stop}`}
                    stop={group.stop}
                    type={group.type}
                    students={group.students}
                    onStudentClick={(sid) => navigate(`/school-admin/students/${sid}`)}
                  />
                ))
              )}
            </TabsContent>

            {/* ── Schedule tab ─────────────────────────────────────────── */}
            <TabsContent value="schedule" className="flex flex-col gap-4">
              {schedule.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                    No trips recorded for this bus yet.
                  </CardContent>
                </Card>
              ) : schedule.map((trip) => (
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
                      <span>
                        {busAttendance.onboarded}/{busAttendance.total} onboarded
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className={trip.isLive ? 'text-blue-500' : 'text-green-500'} />
                      <span className="text-[var(--foreground)]">
                        {trip.isLive ? 'In progress' : <>Completed at <strong>{trip.completedAt}</strong></>}
                      </span>
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
                        <span className="text-sm font-medium text-[var(--foreground)]">{driver?.phone ?? 'Not available'}</span>
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
                    <DetailRow label="School" value={user?.school_name ?? '—'} />
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
            {driver?.phone ? (
              <a href={`tel:${driver.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-lg font-bold text-[var(--primary)] hover:underline">
                <Phone size={18} /> {driver.phone}
              </a>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No phone number on file</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>Close</Button>
            {driver?.phone && (
              <a
                href={`tel:${driver.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 h-9 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90"
              >
                <Phone size={15} /> Call Now
              </a>
            )}
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
