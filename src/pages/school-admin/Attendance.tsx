import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  CalendarCheck, Download, UserCheck, UserX, CalendarOff,
  Percent, QrCode, TrendingUp,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockAttendance, mockAttendanceTrend, mockBuses, mockRoutes } from '@/lib/mockData'
import { formatDate, getInitials, downloadCSV } from '@/lib/utils'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
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

export default function Attendance() {
  const [date, setDate] = useState('2026-06-23')
  const [filterBus, setFilterBus] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [filterRoute, setFilterRoute] = useState('all')

  const schoolBuses = useMemo(() => mockBuses.filter((b) => b.school_id === SCHOOL_ID), [])
  const schoolRoutes = useMemo(() => mockRoutes.filter((r) => r.school_id === SCHOOL_ID), [])

  const uniqueClasses = useMemo(() => {
    const cls = new Set(mockAttendance.map((a) => a.student_class).filter(Boolean))
    return Array.from(cls).sort()
  }, [])

  const filteredAttendance = useMemo(() => {
    return mockAttendance.filter((a) => {
      if (filterClass !== 'all' && a.student_class !== filterClass) return false
      if (filterRoute !== 'all' && a.route_name !== filterRoute) return false
      if (filterBus !== 'all') {
        const route = schoolRoutes.find((r) => r.name === a.route_name)
        if (route?.bus_number !== filterBus) return false
      }
      return true
    })
  }, [filterBus, filterClass, filterRoute, schoolRoutes])

  const stats = useMemo(() => {
    const present = filteredAttendance.filter((a) => a.status === 'present').length
    const absent = filteredAttendance.filter((a) => a.status === 'absent').length
    const leave = filteredAttendance.filter((a) => a.status === 'leave').length
    const total = filteredAttendance.length || 1
    const rate = Math.round((present / total) * 100)
    return { present, absent, leave, rate }
  }, [filteredAttendance])

  function handleExport() {
    downloadCSV(
      filteredAttendance.map((a) => ({
        student: a.student_name,
        class: a.student_class,
        route: a.route_name ?? '',
        status: a.status,
        check_in: a.pickup_time ? formatDate(a.pickup_time, 'time') : '',
        check_out: a.drop_time ? formatDate(a.drop_time, 'time') : '',
        date: a.date,
      })),
      `attendance-${date}`,
    )
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
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{row.student_name}</p>
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
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} /> Export CSV
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
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
    </Layout>
  )
}
