import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, Bus as BusIcon, Navigation, CalendarCheck, UserCheck,
  CalendarClock, MapPin, Clock, ArrowRight, Activity, Gauge,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  allStudents, allBuses, allDrivers, allTrips, allLeaves,
  mockAttendance, mockAttendanceTrend,
} from '@/lib/mockData'

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

interface AreaTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function AttendanceTooltip({ active, payload, label }: AreaTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md text-sm">
        <p className="font-medium text-[var(--foreground)] mb-1.5">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-[var(--muted-foreground)] flex items-center gap-1.5 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold text-[var(--foreground)]">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function SchoolAdminDashboard() {
  const navigate = useNavigate()

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

  const fleetData = useMemo(() => {
    const running = allBuses.filter((b) => b.status === 'running').length
    const idle = allBuses.filter((b) => b.status === 'idle').length
    const offline = allBuses.filter((b) => !b.status || b.status === 'offline').length
    return [
      { name: 'Running', value: running },
      { name: 'Idle', value: idle },
      { name: 'Offline', value: offline },
    ].filter((d) => d.value > 0)
  }, [])

  const liveBuses = useMemo(
    () => allBuses.filter((b) => b.status === 'running' || b.status === 'idle').slice(0, 5),
    [],
  )

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
          <StatsCard title="Attendance Today" value={`${stats.attendancePct}%`} icon={CalendarCheck} color="success" />
          <StatsCard title="Drivers" value={stats.drivers} icon={UserCheck} color="warning" onClick={() => navigate('/school-admin/drivers')} />
          <StatsCard title="Pending Leaves" value={stats.pendingLeaves} icon={CalendarClock} color="danger" onClick={() => navigate('/school-admin/leave')} />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-[var(--primary)]" />
                Attendance Trend
                <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">Last 30 days</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mockAttendanceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<AttendanceTooltip />} />
                  <Area type="monotone" dataKey="present" stroke="var(--primary)" strokeWidth={2} fill="url(#presentGrad)" />
                  <Area type="monotone" dataKey="absent" stroke="#f97316" strokeWidth={2} fill="url(#absentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fleet Status Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Gauge size={18} className="text-[var(--primary)]" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fleetData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {fleetData.map((d) => (
                      <Cell key={d.name} fill={FLEET_COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${String(value)} buses`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
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
        </motion.div>

        {/* Bottom Row: Live Buses + Recent Trips */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Buses */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Navigation size={18} className="text-[var(--primary)]" />
                Live Buses
              </CardTitle>
              <Link to="/school-admin/buses" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {liveBuses.map((bus) => {
                  const onTime = bus.status === 'running'
                  return (
                    <div key={bus.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--muted)]/40 transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                        <BusIcon size={18} className="text-[var(--primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{bus.bus_number}</p>
                          <StatusBadge status={bus.status ?? 'offline'} size="sm" />
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {bus.driver_name ?? 'Unassigned'} · {bus.current_stop ?? 'At depot'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-medium ${onTime ? 'text-green-600' : 'text-[var(--muted-foreground)]'}`}>
                          {onTime ? 'On time' : 'Standby'}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] tabular-nums">{bus.seat_capacity} seats</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Today's Trips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Clock size={18} className="text-[var(--primary)]" />
                Today's Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
                {recentTrips.map((trip) => (
                  <div key={trip.id} className="flex items-start gap-3 px-6 py-3">
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                      <Navigation size={13} className="text-[var(--muted-foreground)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{trip.route_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {trip.bus_number} · {trip.started_at ? formatDate(trip.started_at, 'time') : '—'}
                      </p>
                    </div>
                    <StatusBadge status={trip.status} size="sm" className="flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
