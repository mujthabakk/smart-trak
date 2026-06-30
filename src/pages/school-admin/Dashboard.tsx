import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, Bus as BusIcon, Navigation, CalendarCheck, UserCheck,
  CalendarClock, MapPin, Clock, ArrowRight, Gauge,
  AlertTriangle, BadgeCheck, Radio, CheckCircle2, CircleDot, WifiOff,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatDate, daysUntil } from '@/lib/utils'
import {
  allStudents, allBuses, allDrivers, allTrips, allLeaves,
  mockAttendance, allRoutes,
} from '@/lib/mockData'
import { cn } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const FLEET_COLORS: Record<string, string> = {
  Running: '#3b82f6',
  Idle: '#9ca3af',
  Offline: '#f97316',
}

function expiryBadgeClass(days: number) {
  if (days < 30) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (days < 90) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
}

function expiryLabel(days: number) {
  if (days < 0) return 'Expired'
  if (days === 0) return 'Today'
  return `${days}d`
}

// Live map mini — simulated bus dots on a map placeholder
const SCHOOL_ID = 'sch_001'

export default function SchoolAdminDashboard() {
  const navigate = useNavigate()
  const [liveBusTab, setLiveBusTab] = useState<'morning' | 'afternoon'>('morning')

  const stats = useMemo(() => {
    const totalStudents = allStudents.length
    const activeBuses = allBuses.filter((b) => b.is_active).length
    const onRoute = allBuses.filter((b) => b.status === 'running').length
    const present = mockAttendance.filter((a) => a.status === 'present').length
    const attendancePct = mockAttendance.length
      ? Math.round((present / mockAttendance.length) * 100)
      : 0
    const drivers = allDrivers.length
    const pendingLeaves = allLeaves.filter((l) => l.status === 'pending').length
    return { totalStudents, activeBuses, onRoute, attendancePct, drivers, pendingLeaves }
  }, [])

  const schoolBuses = useMemo(() => allBuses.filter((b) => b.school_id === SCHOOL_ID), [])

  const busStatusCounts = useMemo(() => {
    const onRoute = schoolBuses.filter((b) => b.status === 'running').length
    const idle = schoolBuses.filter((b) => b.status === 'idle').length
    const notStarted = schoolBuses.filter((b) => b.status === 'offline' || !b.status).length
    // "Reached" means completed (simulate with idle + 1 bus)
    const reached = schoolBuses.filter((b) => b.status === 'idle').length
    return { onRoute, idle, notStarted, reached }
  }, [schoolBuses])

  const fleetData = useMemo(() => {
    const running = schoolBuses.filter((b) => b.status === 'running').length
    const idle = schoolBuses.filter((b) => b.status === 'idle').length
    const offline = schoolBuses.filter((b) => !b.status || b.status === 'offline').length
    return [
      { name: 'Running', value: running },
      { name: 'Idle', value: idle },
      { name: 'Offline', value: offline },
    ].filter((d) => d.value > 0)
  }, [schoolBuses])

  // Morning: running buses with pickup routes
  const morningBuses = useMemo(() => {
    return allBuses
      .filter((b) => b.status === 'running')
      .map((bus) => {
        const route = allRoutes.find((r) => r.bus_id === bus.id && r.type === 'pickup')
        const studentCount = route?.student_count ?? bus.seat_capacity
        return { bus, route, studentCount }
      })
      .slice(0, 8)
  }, [])

  const afternoonBuses = useMemo(() => {
    return allBuses
      .filter((b) => b.status === 'idle')
      .map((bus) => {
        const route = allRoutes.find((r) => r.bus_id === bus.id && r.type === 'drop')
        const studentCount = route?.student_count ?? 0
        return { bus, route, studentCount }
      })
      .slice(0, 8)
  }, [])

  // Expiry alerts — buses + drivers
  const busExpiryAlerts = useMemo(() => {
    return allBuses
      .filter((b) => b.school_id === SCHOOL_ID)
      .flatMap((bus) => {
        const rows = []
        const insDays = daysUntil(bus.insurance_expiry ?? '')
        const fitDays = daysUntil(bus.fitness_cert_expiry ?? '')
        if (insDays < 90) rows.push({ id: `${bus.id}-ins`, label: bus.bus_number, sublabel: 'Insurance', days: insDays, busId: bus.id })
        if (fitDays < 90) rows.push({ id: `${bus.id}-fit`, label: bus.bus_number, sublabel: 'Fitness Cert', days: fitDays, busId: bus.id })
        return rows
      })
      .sort((a, b) => a.days - b.days)
  }, [])

  // Driver license expiry alerts
  const driverExpiryAlerts = useMemo(() => {
    return allDrivers
      .filter((d) => d.school_id === SCHOOL_ID)
      .map((d) => ({ id: d.id, name: d.name, days: daysUntil(d.license_expiry), driverId: d.id }))
      .filter((d) => d.days < 90)
      .sort((a, b) => a.days - b.days)
  }, [])

  const recentTrips = useMemo(
    () =>
      [...allTrips]
        .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))
        .slice(0, 5),
    [],
  )

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Good morning, Hassan</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Here is what is happening across your fleet today.
            </p>
          </div>
          <Button onClick={() => navigate('/school-admin/live-map')} className="self-start sm:self-auto">
            <MapPin size={16} />
            Live Map
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard title="Total Students" value={stats.totalStudents} icon={Users} color="primary" onClick={() => navigate('/school-admin/students')} />
          <StatsCard title="Active Buses" value={stats.activeBuses} icon={BusIcon} color="info" onClick={() => navigate('/school-admin/buses')} />
          <StatsCard title="On Route Now" value={stats.onRoute} icon={Navigation} color="success" subtitle="Live trips" />
          <StatsCard title="Attendance Today" value={`${stats.attendancePct}%`} icon={CalendarCheck} color="success" onClick={() => navigate('/school-admin/attendance')} />
          <StatsCard title="Drivers" value={stats.drivers} icon={UserCheck} color="warning" onClick={() => navigate('/school-admin/drivers')} />
          <StatsCard title="Pending Leaves" value={stats.pendingLeaves} icon={CalendarClock} color="danger" onClick={() => navigate('/school-admin/leave')} />
        </motion.div>

        {/* Live Map widget */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-[var(--primary)]" />
                Live Map
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Radio size={10} className="animate-pulse" /> Live
                </span>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate('/school-admin/live-map')}>
                View Full Map <ArrowRight size={13} />
              </Button>
            </CardHeader>
            <CardContent>
              {/* Map placeholder showing bus dots */}
              <div
                className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border border-[var(--border)] cursor-pointer"
                style={{ height: 180 }}
                onClick={() => navigate('/school-admin/live-map')}
              >
                {/* Grid lines to simulate map */}
                <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                {/* Bus dots */}
                {schoolBuses.filter((b) => b.status === 'running').map((bus, i) => (
                  <button
                    key={bus.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/school-admin/buses/${bus.id}`) }}
                    style={{ left: `${20 + i * 22}%`, top: `${25 + (i % 3) * 20}%` }}
                    className="absolute flex flex-col items-center gap-0.5 group"
                  >
                    <div className="h-7 w-7 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <BusIcon size={13} className="text-white" />
                    </div>
                    <span className="rounded bg-white/90 dark:bg-gray-900/90 px-1 py-0.5 text-[9px] font-bold shadow text-gray-800 dark:text-gray-200 group-hover:bg-blue-100 transition-colors">
                      {bus.bus_number}
                    </span>
                  </button>
                ))}
                {schoolBuses.filter((b) => b.status === 'idle').map((bus, i) => (
                  <button
                    key={bus.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/school-admin/buses/${bus.id}`) }}
                    style={{ left: `${65 + i * 15}%`, top: `${50 + i * 15}%` }}
                    className="absolute flex flex-col items-center gap-0.5 group"
                  >
                    <div className="h-6 w-6 rounded-full bg-amber-400 border-2 border-white shadow flex items-center justify-center">
                      <BusIcon size={11} className="text-white" />
                    </div>
                    <span className="rounded bg-white/90 dark:bg-gray-900/90 px-1 py-0.5 text-[9px] font-bold shadow text-gray-800 dark:text-gray-200">
                      {bus.bus_number}
                    </span>
                  </button>
                ))}
                <div className="absolute bottom-2 right-2 text-xs text-[var(--muted-foreground)] bg-white/80 dark:bg-black/50 rounded px-2 py-1">
                  Click to open live map
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bus Status + Expiry Alerts */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bus Status */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <BusIcon size={18} className="text-[var(--primary)]" />
                Bus Status
              </CardTitle>
              <Link to="/school-admin/buses" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {/* Status counts */}
              <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
                {[
                  { label: 'On Route', count: busStatusCounts.onRoute, color: 'text-green-600', dot: 'bg-green-500', filter: 'running' },
                  { label: 'Reached', count: busStatusCounts.reached, color: 'text-amber-600', dot: 'bg-amber-400', filter: 'idle' },
                  { label: 'Not Started', count: busStatusCounts.notStarted, color: 'text-gray-500', dot: 'bg-gray-400', filter: 'offline' },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => navigate(`/school-admin/buses`)}
                    className="flex flex-col items-center py-4 hover:bg-[var(--muted)]/30 transition-colors"
                  >
                    <span className={cn('text-2xl font-bold', s.color)}>{s.count}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] mt-0.5">
                      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bus list by shift */}
              <Tabs value={liveBusTab} onValueChange={(v) => setLiveBusTab(v as 'morning' | 'afternoon')}>
                <div className="px-6 pt-3 pb-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="morning" className="flex-1">Morning</TabsTrigger>
                    <TabsTrigger value="afternoon" className="flex-1">Afternoon</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="morning" className="mt-0">
                  {morningBuses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No morning buses running.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {morningBuses.map(({ bus, route, studentCount }) => (
                        <button
                          key={bus.id}
                          onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                          className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">{bus.bus_number}</p>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {bus.driver_name ?? 'Unassigned'} · {route?.name ?? 'No route'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-[var(--foreground)] tabular-nums">{studentCount} students</p>
                            <p className="text-[11px] text-green-600 font-medium">Running</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="px-6 py-2 text-[11px] text-[var(--muted-foreground)] border-t border-[var(--border)]">
                    Departure window: 6:30 – 8:30 AM
                  </p>
                </TabsContent>

                <TabsContent value="afternoon" className="mt-0">
                  {afternoonBuses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No afternoon buses scheduled.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {afternoonBuses.map(({ bus, route, studentCount }) => (
                        <button
                          key={bus.id}
                          onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                          className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">{bus.bus_number}</p>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {bus.driver_name ?? 'Unassigned'} · {route?.name ?? 'Standing by'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-[var(--foreground)] tabular-nums">{studentCount} students</p>
                            <p className="text-[11px] text-amber-600 font-medium">Idle</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="px-6 py-2 text-[11px] text-[var(--muted-foreground)] border-t border-[var(--border)]">
                    Departure window: 2:00 – 4:00 PM
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Document Expiry Alerts */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Document Expiry Alerts
                {(busExpiryAlerts.length + driverExpiryAlerts.length) > 0 && (
                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {busExpiryAlerts.length + driverExpiryAlerts.length}
                  </span>
                )}
              </CardTitle>
              <Link to="/school-admin/document-expiry" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {busExpiryAlerts.length === 0 && driverExpiryAlerts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--muted-foreground)]">All documents are up to date.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
                  {/* Bus docs */}
                  {busExpiryAlerts.slice(0, 4).map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => navigate(`/school-admin/buses/${alert.busId}`)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <BusIcon size={15} className="text-[var(--muted-foreground)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{alert.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{alert.sublabel}</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', expiryBadgeClass(alert.days))}>
                        {expiryLabel(alert.days)}
                      </span>
                    </button>
                  ))}
                  {/* Driver licenses */}
                  {driverExpiryAlerts.slice(0, 3).map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => navigate(`/school-admin/drivers/${alert.driverId}`)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <BadgeCheck size={15} className="text-[var(--muted-foreground)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{alert.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Driver License</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', expiryBadgeClass(alert.days))}>
                        {expiryLabel(alert.days)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="px-6 py-2 border-t border-[var(--border)] flex gap-4 text-[11px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt;30 days</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> &lt;90 days</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fleet Status + Driver License Expiry */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fleet Status Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Gauge size={18} className="text-[var(--primary)]" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={fleetData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {fleetData.map((d) => (
                      <Cell key={d.name} fill={FLEET_COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${String(value)} buses`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {fleetData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: FLEET_COLORS[d.name] }} />
                      <span className="text-[var(--muted-foreground)]">{d.name}</span>
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Driver License Expiry */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck size={18} className="text-amber-500" />
                Driver License Expiry
                {driverExpiryAlerts.filter((d) => d.days < 30).length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {driverExpiryAlerts.filter((d) => d.days < 30).length} critical
                  </span>
                )}
              </CardTitle>
              <Link to="/school-admin/document-expiry" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {driverExpiryAlerts.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--muted-foreground)]">All licenses are valid.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {driverExpiryAlerts.slice(0, 5).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/school-admin/drivers/${d.driverId}`)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <UserCheck size={15} className="text-[var(--muted-foreground)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">{d.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Driver License</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', expiryBadgeClass(d.days))}>
                        {expiryLabel(d.days)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Trips */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Clock size={18} className="text-[var(--primary)]" />
                Today's Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {recentTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => navigate(`/school-admin/buses/${trip.bus_id}`)}
                    className="w-full flex items-start gap-3 px-6 py-3 hover:bg-[var(--muted)]/30 transition-colors text-left"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                      <Navigation size={13} className="text-[var(--muted-foreground)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{trip.route_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        <span className="hover:text-[var(--primary)] transition-colors">{trip.bus_number}</span>
                        {' · '}{trip.started_at ? formatDate(trip.started_at, 'time') : '—'}
                      </p>
                    </div>
                    <StatusBadge status={trip.status} size="sm" className="flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
