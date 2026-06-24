import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pencil, QrCode, Phone, Mail, MessageCircle, User, MapPin, Bus,
  Route as RouteIcon, ShieldAlert, CalendarCheck, CheckCircle2,
  XCircle, CalendarOff, Clock, Hash, Users,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getInitials, formatDate } from '@/lib/utils'
import { mockStudents, allAttendance, allRoutes, allBuses } from '@/lib/mockData'
import type { AttendanceStatus } from '@/types'

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const ATT_META: Record<AttendanceStatus, { icon: typeof CheckCircle2; color: string }> = {
  present: { icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  absent: { icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  leave: { icon: CalendarOff, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
}

function InfoRow({ icon: Icon, label, value, action }: {
  icon: typeof Phone
  label: string
  value: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] flex-shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{value}</p>
      </div>
      {action}
    </div>
  )
}

export default function StudentProfile() {
  const navigate = useNavigate()
  const { id } = useParams()

  const student = useMemo(
    () => mockStudents.find((s) => s.id === id) ?? mockStudents[0],
    [id],
  )

  const guardian = student.parents[0]

  const route = useMemo(
    () => allRoutes.find((r) => r.name === student.route_name),
    [student.route_name],
  )
  const bus = useMemo(
    () => (route?.bus_id ? allBuses.find((b) => b.id === route.bus_id) : undefined),
    [route],
  )

  // Attendance history for this student
  const records = useMemo(
    () =>
      allAttendance
        .filter((a) => a.student_id === student.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [student.id],
  )

  const stats = useMemo(() => {
    const total = records.length
    const present = records.filter((r) => r.status === 'present').length
    const absent = records.filter((r) => r.status === 'absent').length
    const leave = records.filter((r) => r.status === 'leave').length
    const rate = total ? Math.round((present / total) * 100) : 0
    return { total, present, absent, leave, rate }
  }, [records])

  // Activity timeline derived from present records with timings
  const activity = useMemo(() => {
    const events: { id: string; type: 'pickup' | 'drop'; time: string; stop?: string; route?: string }[] = []
    for (const r of records) {
      if (r.pickup_time) events.push({ id: `${r.id}-p`, type: 'pickup', time: r.pickup_time, stop: r.stop_name, route: r.route_name })
      if (r.drop_time) events.push({ id: `${r.id}-d`, type: 'drop', time: r.drop_time, stop: r.stop_name, route: r.route_name })
    }
    return events.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 8)
  }, [records])

  return (
    <Layout>
      <PageHeader
        title={student.name}
        subtitle={`Student ID · ${student.id.toUpperCase()}`}
        breadcrumbs={[
          { label: 'Students', path: '/school-admin/students' },
          { label: student.name },
        ]}
        actions={
          <>
            <Button variant="outline">
              <QrCode size={15} /> QR Code
            </Button>
            <Button onClick={() => navigate('/school-admin/students/add')}>
              <Pencil size={15} /> Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile header */}
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="overflow-hidden">
              <div className="h-28 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]" />
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                  <div className="h-24 w-24 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[var(--card)] shadow-lg flex-shrink-0">
                    {getInitials(student.name)}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-[var(--foreground)]">{student.name}</h2>
                      <StatusBadge status={student.is_active ? 'active' : 'inactive'} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-1">
                        <User size={14} /> Class {student.class}-{student.division}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hash size={14} /> Roll {student.roll_number}
                      </span>
                      {student.route_name && (
                        <span className="inline-flex items-center gap-1">
                          <RouteIcon size={14} /> {student.route_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Guardian Contact</CardTitle></CardHeader>
                  <CardContent>
                    {guardian ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <InfoRow icon={User} label="Guardian" value={`${guardian.parent_name} · ${guardian.relationship}`} />
                        <InfoRow
                          icon={Phone}
                          label="Phone"
                          value={guardian.phone}
                          action={
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MessageCircle size={15} />
                            </Button>
                          }
                        />
                        <InfoRow icon={Mail} label="Email" value={guardian.email} />
                        <InfoRow icon={MessageCircle} label="WhatsApp" value={guardian.whatsapp} />
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No guardian on file.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Transport Assignment</CardTitle></CardHeader>
                  <CardContent>
                    {student.route_name ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <InfoRow icon={RouteIcon} label="Route" value={route?.name ?? student.route_name} />
                        <InfoRow icon={Bus} label="Bus" value={bus ? `${bus.bus_number} · ${bus.make_model ?? ''}`.trim() : route?.bus_number ?? '—'} />
                        <InfoRow icon={MapPin} label="Pickup Stop" value={route?.stops[0]?.name ?? '—'} />
                        <InfoRow icon={MapPin} label="Drop Stop" value={route?.stops[route.stops.length - 1]?.name ?? '—'} />
                        <InfoRow icon={User} label="Driver" value={route?.driver_name ?? bus?.driver_name ?? 'Unassigned'} />
                        <InfoRow icon={Clock} label="First Pickup" value={route?.stops[0]?.estimated_time ?? '—'} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg bg-[var(--muted)]/50 px-4 py-3">
                        <Bus size={18} className="text-[var(--muted-foreground)]" />
                        <p className="text-sm text-[var(--muted-foreground)]">No route assigned to this student yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Emergency Information</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <InfoRow icon={ShieldAlert} label="Emergency Contact" value={guardian ? `${guardian.parent_name} · ${guardian.phone}` : '—'} />
                      <InfoRow icon={CalendarCheck} label="Date of Birth" value={formatDate(student.dob)} />
                      <InfoRow icon={Users} label="Blood Group" value="O+" />
                      <InfoRow icon={ShieldAlert} label="Medical Notes" value="None recorded" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance */}
              <TabsContent value="attendance" className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <QuickStat label="Present" value={stats.present} tone="text-green-600" />
                  <QuickStat label="Absent" value={stats.absent} tone="text-red-600" />
                  <QuickStat label="On Leave" value={stats.leave} tone="text-yellow-600" />
                </div>

                <Card>
                  <CardHeader><CardTitle>Recent Attendance</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {records.length ? (
                      <div className="divide-y divide-[var(--border)]">
                        {records.slice(0, 12).map((r) => {
                          const meta = ATT_META[r.status]
                          const Icon = meta.icon
                          return (
                            <div key={r.id} className="flex items-center gap-3 px-6 py-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                                <Icon size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[var(--foreground)]">{formatDate(r.date)}</p>
                                <p className="text-xs text-[var(--muted-foreground)] truncate">
                                  {r.route_name ?? '—'}{r.stop_name ? ` · ${r.stop_name}` : ''}
                                  {r.pickup_time ? ` · picked up ${formatDate(r.pickup_time, 'time')}` : ''}
                                </p>
                              </div>
                              <StatusBadge status={r.status} size="sm" />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
                        No attendance records yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader><CardTitle>Trip Activity</CardTitle></CardHeader>
                  <CardContent>
                    {activity.length ? (
                      <div className="relative pl-2">
                        <div className="absolute left-[1.05rem] top-2 bottom-2 w-px bg-[var(--border)]" />
                        <div className="space-y-5">
                          {activity.map((ev) => {
                            const isPickup = ev.type === 'pickup'
                            return (
                              <div key={ev.id} className="relative flex items-start gap-4">
                                <div
                                  className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-[var(--card)] ${
                                    isPickup
                                      ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                                      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                  }`}
                                >
                                  <Bus size={14} />
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                  <p className="text-sm font-medium text-[var(--foreground)]">
                                    {isPickup ? 'Picked up' : 'Dropped off'}
                                    {ev.stop ? ` at ${ev.stop}` : ''}
                                  </p>
                                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                    {ev.route ? `${ev.route} · ` : ''}{formatDate(ev.time, 'datetime')}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                        No trip activity recorded for this student.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* ── Right column: quick stats ── */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">Attendance Rate</p>
                    <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">{stats.rate}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white">
                    <CalendarCheck size={22} />
                  </div>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all"
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Based on {stats.total} recorded trips
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader><CardTitle>This Month</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--muted)]/50 p-3">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">{stats.present}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Days Present</p>
                </div>
                <div className="rounded-xl bg-[var(--muted)]/50 p-3">
                  <p className="text-2xl font-bold text-red-600 tabular-nums">{stats.absent}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Days Absent</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader><CardTitle>Route</CardTitle></CardHeader>
              <CardContent>
                {student.route_name ? (
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <RouteIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{student.route_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Bus {route?.bus_number ?? '—'} · {route?.stops.length ?? 0} stops
                      </p>
                    </div>
                  </div>
                ) : (
                  <Badge variant="muted">Not assigned</Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

function QuickStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 text-center">
        <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
