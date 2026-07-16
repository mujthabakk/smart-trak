import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck, Download, UserCheck, UserX, CalendarOff,
  Percent, QrCode, TrendingUp, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockAttendanceTrend, mockBuses, mockRoutes } from '@/lib/mockData'
import { formatDate, getInitials, downloadCSV } from '@/lib/utils'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { listAttendance } from '@/lib/api/attendance'
import type { AttendanceRecord } from '@/types'

interface TrendTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm shadow-md">
        <p className="mb-1.5 font-medium text-[var(--foreground)]">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-[var(--muted-foreground)] capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold text-[var(--foreground)]">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const SCHOOL_ID = 'sch_001'

/** Format a Date as YYYY-MM-DD in local time */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add days to a YYYY-MM-DD string, return new YYYY-MM-DD */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

/** Format YYYY-MM-DD -> "Mon, 23 Jun 2026" */
function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** All YYYY-MM-DD dates in the calendar week (Sun–Sat) containing dateStr */
function weekDates(dateStr: string): string[] {
  const ref = new Date(dateStr + 'T00:00:00')
  const start = shiftDate(dateStr, -ref.getDay())
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i))
}

/** The `count` days ending on (and including) dateStr */
function trailingDates(dateStr: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDate(dateStr, -(count - 1) + i))
}

/** All YYYY-MM-DD dates from `from` to `to` inclusive (capped to avoid runaway loops) */
function datesInRange(from: string, to: string, maxDays = 92): string[] {
  if (from > to) return []
  const dates: string[] = []
  let d = from
  while (d <= to && dates.length < maxDays) {
    dates.push(d)
    d = shiftDate(d, 1)
  }
  return dates
}

/**
 * The attendance API only supports looking up a single `date` at a time (it
 * defaults to today when no date/trip_id is given), so multi-day views are
 * built by fetching each day in the window and merging the results.
 */
async function fetchAttendanceForDates(dates: string[]): Promise<AttendanceRecord[]> {
  const results = await Promise.all(dates.map((d) => listAttendance({ date: d, pageSize: 100 })))
  const seen = new Set<string>()
  const merged: AttendanceRecord[] = []
  for (const r of results) {
    for (const rec of r.records) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id)
        merged.push(rec)
      }
    }
  }
  return merged
}

type DateFilter = 'today' | 'week' | 'all'

export default function Attendance() {
  const navigate = useNavigate()
  const [date, setDate] = useState('2026-06-23')
  const [filterBus, setFilterBus] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [filterRoute, setFilterRoute] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportFrom, setExportFrom] = useState('2026-06-23')
  const [exportTo, setExportTo] = useState('2026-06-23')
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const today = toLocalDateStr(new Date())

  const [exportError, setExportError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // The API only supports a single `date` filter at a time, so pull whichever
  // window of dates the current tab needs and merge the per-day results.
  const queryDates = useMemo(() => {
    if (dateFilter === 'today') return [date]
    if (dateFilter === 'week') return weekDates(date)
    return trailingDates(date, 30)
  }, [dateFilter, date])

  const {
    data: attendanceRecords = [],
    isLoading: isLoadingAttendance,
    isError: isAttendanceError,
  } = useQuery({
    queryKey: ['attendance', queryDates],
    queryFn: () => fetchAttendanceForDates(queryDates),
  })

  const schoolBuses = useMemo(() => mockBuses.filter((b) => b.school_id === SCHOOL_ID), [])
  const schoolRoutes = useMemo(() => mockRoutes.filter((r) => r.school_id === SCHOOL_ID), [])

  const uniqueClasses = useMemo(() => {
    const cls = new Set(attendanceRecords.map((a) => a.student_class).filter(Boolean))
    return Array.from(cls).sort()
  }, [attendanceRecords])

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((a) => {
      // Date filter
      if (dateFilter === 'today' && a.date !== date) return false
      if (dateFilter === 'week') {
        const aDate = new Date(a.date + 'T00:00:00')
        const refDate = new Date(date + 'T00:00:00')
        const startOfWeek = new Date(refDate)
        startOfWeek.setDate(refDate.getDate() - refDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        if (aDate < startOfWeek || aDate > endOfWeek) return false
      }
      // Other filters
      if (filterClass !== 'all' && a.student_class !== filterClass) return false
      if (filterRoute !== 'all' && a.route_name !== filterRoute) return false
      if (filterBus !== 'all') {
        const route = schoolRoutes.find((r) => r.name === a.route_name)
        if (route?.bus_number !== filterBus) return false
      }
      return true
    })
  }, [attendanceRecords, filterBus, filterClass, filterRoute, schoolRoutes, date, dateFilter])

  const stats = useMemo(() => {
    const present = filteredAttendance.filter((a) => a.status === 'present').length
    const absent = filteredAttendance.filter((a) => a.status === 'absent').length
    const leave = filteredAttendance.filter((a) => a.status === 'leave').length
    const total = filteredAttendance.length || 1
    const rate = Math.round((present / total) * 100)
    return { present, absent, leave, rate }
  }, [filteredAttendance])

  // Summary cards data
  const onboardedStudents = useMemo(
    () => filteredAttendance.filter((a) => a.status === 'present'),
    [filteredAttendance],
  )
  const offboardedStudents = useMemo(
    () => filteredAttendance.filter((a) => a.status === 'absent' || a.status === 'leave'),
    [filteredAttendance],
  )

  function doExport(data: AttendanceRecord[], label: string) {
    downloadCSV(
      data.map((a) => ({
        student: a.student_name,
        class: a.student_class,
        route: a.route_name ?? '',
        status: a.status,
        check_in: a.pickup_time ? formatDate(a.pickup_time, 'time') : '',
        check_out: a.drop_time ? formatDate(a.drop_time, 'time') : '',
        date: a.date,
      })),
      label,
    )
  }

  function handleExportToday() {
    doExport(filteredAttendance, `attendance-${date}`)
    setShowExportMenu(false)
  }

  async function handleExportRange() {
    setExportError('')
    setIsExporting(true)
    try {
      const rangeData = await fetchAttendanceForDates(datesInRange(exportFrom, exportTo))
      doExport(rangeData, `attendance-${exportFrom}-to-${exportTo}`)
      setShowExportMenu(false)
    } catch {
      setExportError('Failed to export attendance for the selected range. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
              {getInitials(row.student_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/school-admin/students/${row.student_id}`) }}
              className="truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] hover:underline transition-colors text-left"
            >
              {row.student_name}
            </button>
            <p className="text-xs text-[var(--muted-foreground)]">{row.stop_name ?? 'No stop recorded'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'student_class',
      header: 'Class',
      render: (row) => <Badge variant="muted">{row.student_class}</Badge>,
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (row) => <span className="text-sm text-[var(--foreground)]">{row.route_name ?? '—'}</span>,
    },
    {
      key: 'pickup_time',
      header: 'Check-in',
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">
          {row.pickup_time ? formatDate(row.pickup_time, 'time') : <span className="text-[var(--muted-foreground)]">—</span>}
        </span>
      ),
    },
    {
      key: 'drop_time',
      header: 'Check-out',
      render: (row) => (
        <span className="text-sm tabular-nums text-[var(--foreground)]">
          {row.drop_time ? formatDate(row.drop_time, 'time') : <span className="text-[var(--muted-foreground)]">—</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) =>
        row.status === 'leave' ? (
          <span className="text-xs text-[var(--muted-foreground)]">—</span>
        ) : (
          <Badge variant="info" className="gap-1">
            <QrCode size={11} /> QR
          </Badge>
        ),
    },
  ]

  return (
    <Layout>
      <PageHeader
        title="Attendance"
        subtitle="Daily QR-based attendance"
        actions={
          <>
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button variant="outline" onClick={() => setShowExportMenu((v) => !v)}>
                <Download size={16} /> Export CSV
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg p-3 space-y-3">
                  <button
                    onClick={handleExportToday}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors flex items-center gap-2"
                  >
                    <Download size={14} className="text-[var(--primary)]" />
                    Export Today ({date})
                  </button>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Export Range</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] text-[var(--muted-foreground)] mb-0.5 block">From</label>
                        <input
                          type="date"
                          value={exportFrom}
                          onChange={(e) => setExportFrom(e.target.value)}
                          className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] text-[var(--muted-foreground)] mb-0.5 block">To</label>
                        <input
                          type="date"
                          value={exportTo}
                          onChange={(e) => setExportTo(e.target.value)}
                          className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleExportRange} loading={isExporting} disabled={isExporting}>
                      <Download size={13} /> Export Range
                    </Button>
                    {exportError && (
                      <p className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--destructive)' }}>
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {exportError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowExportMenu(false)}
                    className="w-full text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />

      {/* Horizontal Calendar */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-3">
          <HorizontalCalendar selectedDate={date} onSelectDate={setDate} />
        </CardContent>
      </Card>

      {isAttendanceError && (
        <div
          className="mb-5 flex items-start gap-2 rounded-xl p-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load attendance records. Please try again.
        </div>
      )}

      {isLoadingAttendance ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
      <>
      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Onboarded Today */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserCheck size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Onboarded Today</p>
                <p className="text-xs text-[var(--muted-foreground)]">Present students</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">
              {onboardedStudents.length}
            </p>
          </div>
          {onboardedStudents.length > 0 && (
            <div className="space-y-1">
              {onboardedStudents.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {getInitials(a.student_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-[var(--muted-foreground)] truncate">{a.student_name}</span>
                </div>
              ))}
              {onboardedStudents.length > 3 && (
                <p className="text-xs text-[var(--muted-foreground)] pl-7">+{onboardedStudents.length - 3} more</p>
              )}
            </div>
          )}
        </div>

        {/* Offboarded Today */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <UserX size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Offboarded Today</p>
                <p className="text-xs text-[var(--muted-foreground)]">Absent + on leave</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {offboardedStudents.length}
            </p>
          </div>
          {offboardedStudents.length > 0 && (
            <div className="space-y-1">
              {offboardedStudents.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {getInitials(a.student_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-[var(--muted-foreground)] truncate">{a.student_name}</span>
                </div>
              ))}
              {offboardedStudents.length > 3 && (
                <p className="text-xs text-[var(--muted-foreground)] pl-7">+{offboardedStudents.length - 3} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Date filter pills */}
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          {(['today', 'week', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                dateFilter === f
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All'}
            </button>
          ))}
        </div>

        <Select value={filterBus} onValueChange={setFilterBus}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Buses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buses</SelectItem>
            {schoolBuses.map((b) => (
              <SelectItem key={b.id} value={b.bus_number}>Bus {b.bus_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {uniqueClasses.map((c) => (
              <SelectItem key={c} value={c}>Class {c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRoute} onValueChange={setFilterRoute}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All Routes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {schoolRoutes.map((r) => (
              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterBus !== 'all' || filterClass !== 'all' || filterRoute !== 'all') && (
          <button
            onClick={() => { setFilterBus('all'); setFilterClass('all'); setFilterRoute('all') }}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard title="Present" value={stats.present} icon={UserCheck} color="success" />
        <StatsCard title="Absent" value={stats.absent} icon={UserX} color="danger" />
        <StatsCard title="On Leave" value={stats.leave} icon={CalendarOff} color="warning" />
        <StatsCard title="Attendance Rate" value={`${stats.rate}%`} icon={Percent} color="primary" subtitle="of recorded students" />
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarCheck size={15} /> Daily Log
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp size={15} /> Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <DataTable
            columns={columns}
            data={filteredAttendance}
            keyField="id"
            searchable
            searchKeys={['student_name', 'student_class', 'route_name']}
            searchPlaceholder="Search students…"
            emptyTitle="No attendance records"
            emptyDescription="No attendance has been recorded for the selected date."
          />
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--primary)]" />
                Attendance Trend (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockAttendanceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="present-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absent-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize text-[var(--foreground)]">{v}</span>} />
                  <Area type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} fill="url(#present-grad)" />
                  <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="url(#absent-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
      )}
    </Layout>
  )
}
