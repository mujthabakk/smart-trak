import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  Download, BarChart3, Users, UserCheck, UserX, Percent,
  Bus as BusIcon, Route as RouteIcon, UserCog, Activity, Clock,
  CalendarDays, GraduationCap, AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  mockAttendance, mockExtraAttendance,
  mockBuses, mockRoutes, mockDrivers,
  mockTrips, mockExtraTrips,
  mockExtraBuses, mockExtraRoutes, mockExtraDrivers,
  allStudents,
} from '@/lib/mockData'
import { getAttendanceTrend, getFleetSummary } from '@/lib/api/reports'
import { formatDate, getInitials, downloadCSV } from '@/lib/utils'
import type { AttendanceRecord, Bus, Route, Driver, Trip, StatsCard as StatsCardData } from '@/types'

// ─── Live stat icon / color resolution ──────────────────────────────────────
// Same string-to-component pattern used for NavItem icons in
// src/components/layout/Sidebar.tsx (ICON_MAP lookup with a safe fallback).
const FLEET_ICON_MAP: Record<string, LucideIcon> = {
  Bus: BusIcon,
  Users,
  UserCheck,
  UserCog,
  Route: RouteIcon,
  GraduationCap,
  Activity,
  Percent,
}

const FLEET_COLOR_MAP: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  blue: 'info',
  green: 'success',
  red: 'danger',
  amber: 'warning',
  orange: 'warning',
  yellow: 'warning',
  purple: 'primary',
  primary: 'primary',
  gray: 'info',
  grey: 'info',
}

function resolveStatIcon(name: string): LucideIcon {
  return FLEET_ICON_MAP[name] ?? BarChart3
}

function resolveStatColor(name: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return FLEET_COLOR_MAP[name] ?? 'primary'
}

// ─── Constants ──────────────────────────────────────────────────────────────
const SCHOOL_ID = 'sch_001'

const REPORT_TYPES = [
  { value: 'attendance', label: 'Attendance Report' },
  { value: 'trip_completion', label: 'Trip Completion Report' },
  { value: 'bus_performance', label: 'Bus Performance Report' },
  { value: 'route', label: 'Route Report' },
  { value: 'driver_activity', label: 'Driver Activity Report' },
] as const

type ReportType = (typeof REPORT_TYPES)[number]['value']

// ─── Animation variants ──────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── Derived report row types ────────────────────────────────────────────────
interface TripCompletionRow {
  id: string
  route_name: string
  bus_number: string
  driver_name: string
  status: string
  started_at: string
  duration: string
  student_count: number
}

interface BusPerformanceRow {
  id: string
  bus_number: string
  make_model: string
  is_active: boolean
  active_days: number
  routes_completed: number
  total_students: number
}

interface RouteRow {
  id: string
  name: string
  bus_number: string
  driver_name: string
  student_count: number
  stops_count: number
  is_active: boolean
}

interface DriverActivityRow {
  id: string
  driver_name: string
  bus_number: string
  routes_count: number
  total_trips: number
  is_active: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcDuration(started: string, ended?: string): string {
  if (!ended) return 'In Progress'
  const ms = new Date(ended).getTime() - new Date(started).getTime()
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SchoolReports() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [reportType, setReportType] = useState<ReportType>('attendance')
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [filterBus, setFilterBus] = useState('all')
  const [filterRoute, setFilterRoute] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // ── Live fleet summary + attendance trend (real backend data) ────────────
  const {
    data: fleetSummary,
    isLoading: fleetLoading,
    isError: fleetIsError,
  } = useQuery<StatsCardData[]>({
    queryKey: ['reports', 'fleet-summary'],
    queryFn: () => getFleetSummary(),
  })

  const {
    data: attendanceTrend,
    isLoading: trendLoading,
    isError: trendIsError,
  } = useQuery({
    queryKey: ['reports', 'attendance-trend'],
    queryFn: () => getAttendanceTrend(),
  })

  // School-scoped base data
  const schoolBuses = useMemo(
    () => [...mockBuses, ...mockExtraBuses].filter((b) => b.school_id === SCHOOL_ID),
    [],
  )
  const schoolRoutes = useMemo(
    () => [...mockRoutes, ...mockExtraRoutes].filter((r) => r.school_id === SCHOOL_ID),
    [],
  )
  const schoolDrivers = useMemo(
    () => [...mockDrivers, ...mockExtraDrivers].filter((d) => d.school_id === SCHOOL_ID),
    [],
  )
  const allAttendance = useMemo(
    () => [...mockAttendance, ...mockExtraAttendance],
    [],
  )
  const allTrips = useMemo(
    () => [...mockTrips, ...mockExtraTrips],
    [],
  )

  // ── Attendance report ──────────────────────────────────────────────────────
  const filteredAttendance = useMemo<AttendanceRecord[]>(() => {
    return allAttendance.filter((a) => {
      if (a.date < dateFrom || a.date > dateTo) return false
      if (filterStatus !== 'all') {
        const statusMap: Record<string, string> = { Present: 'present', Absent: 'absent', 'On Leave': 'leave' }
        if (a.status !== statusMap[filterStatus]) return false
      }
      if (filterRoute !== 'all' && a.route_name !== filterRoute) return false
      if (filterBus !== 'all') {
        const route = schoolRoutes.find((r) => r.name === a.route_name)
        if (route?.bus_number !== filterBus) return false
      }
      return true
    })
  }, [allAttendance, dateFrom, dateTo, filterStatus, filterRoute, filterBus, schoolRoutes])

  // ── Trip completion report ────────────────────────────────────────────────
  const filteredTrips = useMemo<TripCompletionRow[]>(() => {
    return allTrips
      .filter((t) => {
        if (!t.started_at) return false
        const date = t.started_at.split('T')[0]
        if (date < dateFrom || date > dateTo) return false
        if (filterBus !== 'all' && t.bus_number !== filterBus) return false
        if (filterRoute !== 'all' && t.route_name !== filterRoute) return false
        if (filterStatus !== 'all') {
          const statusMap: Record<string, string> = { Present: 'completed', Absent: 'in_progress', 'On Leave': 'cancelled' }
          if (t.status !== statusMap[filterStatus]) return false
        }
        return true
      })
      .map((t) => ({
        id: t.id,
        route_name: t.route_name,
        bus_number: t.bus_number,
        driver_name: t.driver_name,
        status: t.status,
        started_at: t.started_at ?? '',
        duration: calcDuration(t.started_at ?? '', t.ended_at),
        student_count: t.student_count ?? 0,
      }))
  }, [allTrips, dateFrom, dateTo, filterBus, filterRoute, filterStatus])

  // ── Bus performance report ────────────────────────────────────────────────
  const busPerformanceData = useMemo<BusPerformanceRow[]>(() => {
    return schoolBuses
      .filter((b) => {
        if (filterBus !== 'all' && b.bus_number !== filterBus) return false
        return true
      })
      .map((b) => {
        const busTrips = allTrips.filter(
          (t) =>
            t.bus_id === b.id &&
            t.started_at != null &&
            t.started_at.split('T')[0] >= dateFrom &&
            t.started_at.split('T')[0] <= dateTo,
        )
        const completedTrips = busTrips.filter((t) => t.status === 'completed')
        const totalStudents = busTrips.reduce((sum, t) => sum + (t.student_count ?? 0), 0)
        const uniqueDays = new Set(busTrips.map((t) => t.started_at!.split('T')[0])).size
        return {
          id: b.id,
          bus_number: b.bus_number,
          make_model: b.make_model ?? '—',
          is_active: b.is_active,
          active_days: uniqueDays,
          routes_completed: completedTrips.length,
          total_students: totalStudents,
        }
      })
  }, [schoolBuses, allTrips, filterBus, dateFrom, dateTo])

  // ── Route report ──────────────────────────────────────────────────────────
  const routeReportData = useMemo<RouteRow[]>(() => {
    return schoolRoutes
      .filter((r) => {
        if (filterBus !== 'all' && r.bus_number !== filterBus) return false
        if (filterRoute !== 'all' && r.name !== filterRoute) return false
        return true
      })
      .map((r) => ({
        id: r.id,
        name: r.name,
        bus_number: r.bus_number ?? '—',
        driver_name: r.driver_name ?? '—',
        student_count: r.student_count ?? 0,
        stops_count: r.stops?.length ?? 0,
        is_active: r.is_active,
      }))
  }, [schoolRoutes, filterBus, filterRoute])

  // ── Driver activity report ────────────────────────────────────────────────
  const driverActivityData = useMemo<DriverActivityRow[]>(() => {
    return schoolDrivers
      .filter((d) => {
        if (filterBus !== 'all') {
          const bus = schoolBuses.find((b) => b.id === d.assigned_bus_id)
          if (bus?.bus_number !== filterBus) return false
        }
        return true
      })
      .map((d) => {
        const driverTrips = allTrips.filter(
          (t) =>
            t.driver_id === d.id &&
            t.started_at != null &&
            t.started_at.split('T')[0] >= dateFrom &&
            t.started_at.split('T')[0] <= dateTo,
        )
        const uniqueRoutes = new Set(driverTrips.map((t) => t.route_id)).size
        return {
          id: d.id,
          driver_name: d.name,
          bus_number: d.assigned_bus_number ?? '—',
          routes_count: uniqueRoutes,
          total_trips: driverTrips.length,
          is_active: d.is_active,
        }
      })
  }, [schoolDrivers, schoolBuses, allTrips, filterBus, dateFrom, dateTo])

  // ── Stats (attendance-based for attendance report; generic otherwise) ──────
  const stats = useMemo(() => {
    if (reportType === 'attendance') {
      const present = filteredAttendance.filter((a) => a.status === 'present').length
      const absent = filteredAttendance.filter((a) => a.status === 'absent').length
      const leave = filteredAttendance.filter((a) => a.status === 'leave').length
      const total = filteredAttendance.length || 1
      return {
        total: filteredAttendance.length,
        present,
        absent,
        rate: Math.round((present / total) * 100),
      }
    }
    if (reportType === 'trip_completion') {
      const completed = filteredTrips.filter((t) => t.status === 'completed').length
      const inProg = filteredTrips.filter((t) => t.status === 'in_progress').length
      const total = filteredTrips.length || 1
      return {
        total: filteredTrips.length,
        present: completed,
        absent: inProg,
        rate: Math.round((completed / total) * 100),
      }
    }
    if (reportType === 'bus_performance') {
      const activeBuses = busPerformanceData.filter((b) => b.is_active).length
      const totalRoutes = busPerformanceData.reduce((s, b) => s + b.routes_completed, 0)
      const totalStudents = busPerformanceData.reduce((s, b) => s + b.total_students, 0)
      return {
        total: busPerformanceData.length,
        present: activeBuses,
        absent: busPerformanceData.length - activeBuses,
        rate: totalStudents > 0 ? Math.min(100, Math.round((totalRoutes / (busPerformanceData.length * 3 || 1)) * 100)) : 0,
      }
    }
    if (reportType === 'route') {
      const active = routeReportData.filter((r) => r.is_active).length
      const totalStudents = routeReportData.reduce((s, r) => s + r.student_count, 0)
      return {
        total: routeReportData.length,
        present: active,
        absent: routeReportData.length - active,
        rate: routeReportData.length ? Math.round((active / routeReportData.length) * 100) : 0,
      }
    }
    // driver_activity
    const active = driverActivityData.filter((d) => d.is_active).length
    const totalTrips = driverActivityData.reduce((s, d) => s + d.total_trips, 0)
    return {
      total: driverActivityData.length,
      present: active,
      absent: driverActivityData.length - active,
      rate: driverActivityData.length ? Math.round((active / driverActivityData.length) * 100) : 0,
    }
  }, [reportType, filteredAttendance, filteredTrips, busPerformanceData, routeReportData, driverActivityData])

  // ── Stat card labels per report type ─────────────────────────────────────
  const statLabels = useMemo(() => {
    switch (reportType) {
      case 'attendance':
        return { total: 'Total Records', col2: 'Present', col3: 'Absent', col4: 'Attendance Rate' }
      case 'trip_completion':
        return { total: 'Total Trips', col2: 'Completed', col3: 'In Progress', col4: 'Completion Rate' }
      case 'bus_performance':
        return { total: 'Total Buses', col2: 'Active Buses', col3: 'Inactive Buses', col4: 'Utilisation Rate' }
      case 'route':
        return { total: 'Total Routes', col2: 'Active Routes', col3: 'Inactive Routes', col4: 'Active Rate' }
      case 'driver_activity':
        return { total: 'Total Drivers', col2: 'Active Drivers', col3: 'Inactive Drivers', col4: 'Active Rate' }
    }
  }, [reportType])

  // ── CSV export ────────────────────────────────────────────────────────────
  function handleExport() {
    const filename = `${reportType}-${dateFrom}-to-${dateTo}`
    switch (reportType) {
      case 'attendance':
        downloadCSV(
          filteredAttendance.map((a) => ({
            student_name: a.student_name,
            class: a.student_class ?? '',
            route: a.route_name ?? '',
            status: a.status,
            check_in: a.pickup_time ? formatDate(a.pickup_time, 'time') : '',
            date: a.date,
          })),
          filename,
        )
        break
      case 'trip_completion':
        downloadCSV(
          filteredTrips.map((t) => ({
            route_name: t.route_name,
            bus: t.bus_number,
            driver: t.driver_name,
            status: t.status,
            start_time: formatDate(t.started_at, 'datetime'),
            duration: t.duration,
            students: t.student_count,
          })),
          filename,
        )
        break
      case 'bus_performance':
        downloadCSV(
          busPerformanceData.map((b) => ({
            bus_number: b.bus_number,
            make_model: b.make_model,
            active: b.is_active ? 'Yes' : 'No',
            active_days: b.active_days,
            routes_completed: b.routes_completed,
            total_students: b.total_students,
          })),
          filename,
        )
        break
      case 'route':
        downloadCSV(
          routeReportData.map((r) => ({
            route_name: r.name,
            bus: r.bus_number,
            driver: r.driver_name,
            students: r.student_count,
            stops: r.stops_count,
            status: r.is_active ? 'Active' : 'Inactive',
          })),
          filename,
        )
        break
      case 'driver_activity':
        downloadCSV(
          driverActivityData.map((d) => ({
            driver_name: d.driver_name,
            bus: d.bus_number,
            routes: d.routes_count,
            total_trips: d.total_trips,
            status: d.is_active ? 'Active' : 'Inactive',
          })),
          filename,
        )
        break
    }
  }

  // ── Column definitions ────────────────────────────────────────────────────
  const attendanceColumns: Column<AttendanceRecord>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
              {getInitials(row.student_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[180px]">{row.student_name}</span>
        </div>
      ),
    },
    {
      key: 'student_class',
      header: 'Class',
      render: (row) => <Badge variant="muted">{row.student_class ?? '—'}</Badge>,
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (row) => (
        <span className="text-sm text-[var(--foreground)]">{row.route_name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'pickup_time',
      header: 'Check-in Time',
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">
          {row.pickup_time ? formatDate(row.pickup_time, 'time') : <span className="text-[var(--muted-foreground)]">—</span>}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">{formatDate(row.date, 'short')}</span>
      ),
    },
  ]

  const tripColumns: Column<TripCompletionRow>[] = [
    {
      key: 'route_name',
      header: 'Route Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <RouteIcon size={14} className="text-[var(--primary)]" />
          </div>
          <span className="text-sm font-medium text-[var(--foreground)]">{row.route_name}</span>
        </div>
      ),
    },
    {
      key: 'bus_number',
      header: 'Bus',
      render: (row) => <Badge variant="muted">Bus {row.bus_number}</Badge>,
    },
    {
      key: 'driver_name',
      header: 'Driver',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
              {getInitials(row.driver_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[var(--foreground)] truncate max-w-[150px]">{row.driver_name}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'started_at',
      header: 'Start Time',
      sortable: true,
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">{formatDate(row.started_at, 'datetime')}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-[var(--foreground)]">
          <Clock size={13} className="text-[var(--muted-foreground)]" />
          {row.duration}
        </span>
      ),
    },
    {
      key: 'student_count',
      header: 'Students',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
          <Users size={13} className="text-[var(--muted-foreground)]" />
          {row.student_count}
        </span>
      ),
    },
  ]

  const busColumns: Column<BusPerformanceRow>[] = [
    {
      key: 'bus_number',
      header: 'Bus Number',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <BusIcon size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">Bus {row.bus_number}</span>
        </div>
      ),
    },
    {
      key: 'make_model',
      header: 'Make / Model',
      render: (row) => <span className="text-sm text-[var(--foreground)]">{row.make_model}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
    {
      key: 'active_days',
      header: 'Active Days',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{row.active_days}</span>
      ),
    },
    {
      key: 'routes_completed',
      header: 'Routes Completed',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{row.routes_completed}</span>
      ),
    },
    {
      key: 'total_students',
      header: 'Total Students',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
          <Users size={13} className="text-[var(--muted-foreground)]" />
          {row.total_students}
        </span>
      ),
    },
  ]

  const routeColumns: Column<RouteRow>[] = [
    {
      key: 'name',
      header: 'Route Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <RouteIcon size={14} className="text-[var(--primary)]" />
          </div>
          <span className="text-sm font-medium text-[var(--foreground)]">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'bus_number',
      header: 'Bus',
      render: (row) => <Badge variant="muted">Bus {row.bus_number}</Badge>,
    },
    {
      key: 'driver_name',
      header: 'Driver',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
              {getInitials(row.driver_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[var(--foreground)] truncate max-w-[150px]">{row.driver_name}</span>
        </div>
      ),
    },
    {
      key: 'student_count',
      header: 'Active Students',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--foreground)]">
          <Users size={13} className="text-[var(--muted-foreground)]" />
          {row.student_count}
        </span>
      ),
    },
    {
      key: 'stops_count',
      header: 'Total Stops',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{row.stops_count}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
  ]

  const driverColumns: Column<DriverActivityRow>[] = [
    {
      key: 'driver_name',
      header: 'Driver Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
              {getInitials(row.driver_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[180px]">{row.driver_name}</span>
        </div>
      ),
    },
    {
      key: 'bus_number',
      header: 'Bus',
      render: (row) => (
        <Badge variant="muted">{row.bus_number !== '—' ? `Bus ${row.bus_number}` : '—'}</Badge>
      ),
    },
    {
      key: 'routes_count',
      header: 'Routes',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{row.routes_count}</span>
      ),
    },
    {
      key: 'total_trips',
      header: 'Total Trips',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{row.total_trips}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Active Status',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
  ]

  // ── Active table data + columns ───────────────────────────────────────────
  const { tableData, tableColumns, tableSearchKeys, tableEmpty } = useMemo(() => {
    switch (reportType) {
      case 'attendance':
        return {
          tableData: filteredAttendance as object[],
          tableColumns: attendanceColumns as Column<object>[],
          tableSearchKeys: ['student_name', 'student_class', 'route_name'] as (keyof object)[],
          tableEmpty: 'No attendance records for the selected filters.',
        }
      case 'trip_completion':
        return {
          tableData: filteredTrips as object[],
          tableColumns: tripColumns as Column<object>[],
          tableSearchKeys: ['route_name', 'bus_number', 'driver_name'] as (keyof object)[],
          tableEmpty: 'No trip records for the selected filters.',
        }
      case 'bus_performance':
        return {
          tableData: busPerformanceData as object[],
          tableColumns: busColumns as Column<object>[],
          tableSearchKeys: ['bus_number', 'make_model'] as (keyof object)[],
          tableEmpty: 'No bus performance data found.',
        }
      case 'route':
        return {
          tableData: routeReportData as object[],
          tableColumns: routeColumns as Column<object>[],
          tableSearchKeys: ['name', 'bus_number', 'driver_name'] as (keyof object)[],
          tableEmpty: 'No route data found.',
        }
      case 'driver_activity':
        return {
          tableData: driverActivityData as object[],
          tableColumns: driverColumns as Column<object>[],
          tableSearchKeys: ['driver_name', 'bus_number'] as (keyof object)[],
          tableEmpty: 'No driver activity for the selected filters.',
        }
    }
  }, [
    reportType,
    filteredAttendance,
    filteredTrips,
    busPerformanceData,
    routeReportData,
    driverActivityData,
  ])

  const hasFilters =
    filterBus !== 'all' || filterRoute !== 'all' || filterStatus !== 'all'

  function resetFilters() {
    setFilterBus('all')
    setFilterRoute('all')
    setFilterStatus('all')
  }

  // ── Daily Report state + data ─────────────────────────────────────────────
  const [dailyDate, setDailyDate] = useState(today)

  const schoolStudents = useMemo(
    () => allStudents.filter((s) => s.school_id === SCHOOL_ID),
    [],
  )

  // Attendance records for the selected day (school-scoped via route lookup)
  const dailyAttendance = useMemo<AttendanceRecord[]>(() => {
    return allAttendance.filter((a) => a.date === dailyDate)
  }, [allAttendance, dailyDate])

  const presentStudents = useMemo(
    () => dailyAttendance.filter((a) => a.status === 'present'),
    [dailyAttendance],
  )
  const absentStudents = useMemo(
    () => dailyAttendance.filter((a) => a.status === 'absent'),
    [dailyAttendance],
  )

  const dailyStats = useMemo(() => {
    const total = dailyAttendance.length || 1
    const present = presentStudents.length
    const absent = absentStudents.length
    const pct = Math.round((present / total) * 100)
    return { total: dailyAttendance.length, present, absent, pct }
  }, [dailyAttendance, presentStudents, absentStudents])

  function exportDailyCSV() {
    const rows = [
      ...presentStudents.map((a) => ({
        status: 'Present',
        student_name: a.student_name,
        class: a.student_class ?? '',
        route: a.route_name ?? '',
        scan_time: a.pickup_time ? formatDate(a.pickup_time, 'time') : '',
      })),
      ...absentStudents.map((a) => ({
        status: 'Absent',
        student_name: a.student_name,
        class: a.student_class ?? '',
        route: a.route_name ?? '',
        scan_time: '',
      })),
    ]
    downloadCSV(rows, `daily-report-${dailyDate}`)
  }

  const dailyStudentColumns: Column<AttendanceRecord>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
              {getInitials(row.student_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[180px]">
            {row.student_name}
          </span>
        </div>
      ),
    },
    {
      key: 'student_class',
      header: 'Class',
      render: (row) => <Badge variant="muted">{row.student_class ?? '—'}</Badge>,
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (row) => (
        <span className="text-sm text-[var(--foreground)]">{row.route_name ?? '—'}</span>
      ),
    },
    {
      key: 'pickup_time',
      header: 'Scan Time',
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">
          {row.pickup_time
            ? formatDate(row.pickup_time, 'time')
            : <span className="text-[var(--muted-foreground)]">—</span>}
        </span>
      ),
    },
  ]

  return (
    <Layout>
      {/* ── Page Header ── */}
      <PageHeader
        title="Reports"
        subtitle="Generate and export reports for attendance, trips, buses, routes and drivers"
        actions={
          <Button onClick={handleExport} className="gap-2">
            <Download size={16} />
            Export CSV
          </Button>
        }
      />

      {/* ── Top-level tab switcher ── */}
      <Tabs defaultValue="standard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="standard" className="gap-1.5">
            <BarChart3 size={14} /> Standard Reports
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays size={14} /> Daily Report
          </TabsTrigger>
        </TabsList>

        {/* ══ Daily Report tab ══ */}
        <TabsContent value="daily" className="space-y-6">
          {/* Date picker + export */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div variants={item}>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays size={16} className="text-[var(--primary)]" />
                      Select Date
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={exportDailyCSV} className="gap-1.5">
                      <Download size={14} /> Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide whitespace-nowrap">
                      Date
                    </Label>
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Daily stats */}
            <motion.div variants={container} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <motion.div variants={item}>
                <StatsCard title="Total Scanned" value={dailyStats.total} icon={Users} color="primary" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard title="Present" value={dailyStats.present} icon={UserCheck} color="success" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard title="Absent" value={dailyStats.absent} icon={UserX} color="danger" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard title="Attendance %" value={`${dailyStats.pct}%`} icon={Percent} color="info" subtitle="of scanned records" />
              </motion.div>
            </motion.div>

            {/* Present students table */}
            <motion.div variants={item}>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck size={18} className="text-green-500" />
                    Present Students
                    <Badge variant="muted" className="ml-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {presentStudents.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <DataTable
                    columns={dailyStudentColumns}
                    data={presentStudents}
                    keyField="id"
                    searchable
                    searchKeys={['student_name', 'student_class', 'route_name'] as (keyof AttendanceRecord)[]}
                    searchPlaceholder="Search present students…"
                    pageSize={10}
                    emptyTitle="No present students"
                    emptyDescription="No students were scanned as present on this date."
                    className="border-0 rounded-none shadow-none"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Absent students table */}
            <motion.div variants={item}>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserX size={18} className="text-red-500" />
                    Absent Students
                    <Badge variant="muted" className="ml-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {absentStudents.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <DataTable
                    columns={dailyStudentColumns}
                    data={absentStudents}
                    keyField="id"
                    searchable
                    searchKeys={['student_name', 'student_class', 'route_name'] as (keyof AttendanceRecord)[]}
                    searchPlaceholder="Search absent students…"
                    pageSize={10}
                    emptyTitle="No absent students"
                    emptyDescription="No students were marked absent on this date."
                    className="border-0 rounded-none shadow-none"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ══ Standard Reports tab ══ */}
        <TabsContent value="standard">

      {/* ── Filter Card ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Live Fleet & Attendance Snapshot (from the reports API) ── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity size={16} className="text-[var(--primary)]" />
                Live Fleet &amp; Attendance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {(fleetIsError || trendIsError) && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Unable to load live snapshot data right now.
                </div>
              )}

              {fleetLoading ? (
                <div className="flex justify-center py-6"><LoadingSpinner /></div>
              ) : (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {(fleetSummary ?? []).map((card) => (
                    <StatsCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      change={card.change}
                      icon={resolveStatIcon(card.icon)}
                      color={resolveStatColor(card.color)}
                      subtitle={card.subtitle}
                    />
                  ))}
                </div>
              )}

              {trendLoading ? (
                <div className="flex justify-center py-10"><LoadingSpinner /></div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={attendanceTrend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} />
                    <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 size={16} className="text-[var(--primary)]" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {/* Date From */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    From Date
                  </Label>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    To Date
                  </Label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>

                {/* Report Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Report Type
                  </Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bus */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Bus
                  </Label>
                  <Select value={filterBus} onValueChange={setFilterBus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Buses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buses</SelectItem>
                      {schoolBuses.map((b) => (
                        <SelectItem key={b.id} value={b.bus_number}>
                          Bus {b.bus_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Route */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Route
                  </Label>
                  <Select value={filterRoute} onValueChange={setFilterRoute}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Routes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Routes</SelectItem>
                      {schoolRoutes.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second row: Status + Reset */}
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Status Filter
                  </Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Stats Cards ── */}
        <motion.div
          variants={container}
          className="grid grid-cols-2 gap-4 xl:grid-cols-4"
        >
          <motion.div variants={item}>
            <StatsCard
              title={statLabels.total}
              value={stats.total}
              icon={Activity}
              color="primary"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title={statLabels.col2}
              value={stats.present}
              icon={UserCheck}
              color="success"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title={statLabels.col3}
              value={stats.absent}
              icon={UserX}
              color="danger"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title={statLabels.col4}
              value={`${stats.rate}%`}
              icon={Percent}
              color="info"
              subtitle="of filtered records"
            />
          </motion.div>
        </motion.div>

        {/* ── Report Table ── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-[var(--primary)]" />
                  {REPORT_TYPES.find((r) => r.value === reportType)?.label}
                  <Badge variant="muted" className="ml-1">
                    {tableData.length} record{tableData.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                  <Download size={14} />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <DataTable
                columns={tableColumns}
                data={tableData}
                keyField={'id' as keyof object}
                searchable
                searchKeys={tableSearchKeys}
                searchPlaceholder="Search records…"
                pageSize={10}
                emptyTitle="No records found"
                emptyDescription={tableEmpty}
                className="border-0 rounded-none shadow-none"
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

        </TabsContent>
      </Tabs>
    </Layout>
  )
}
