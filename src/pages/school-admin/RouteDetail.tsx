import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allRoutes, allStudents } from '@/lib/mockData'
import { getInitials } from '@/lib/utils'
import {
  ArrowLeft, QrCode, MapPin, CircleDot, Clock, Users,
  Bus as BusIcon, User, ChevronDown, ChevronUp,
  Navigation, ArrowRight,
} from 'lucide-react'
import type { Stop } from '@/types'

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

// ─── QR download (same pattern as Routes.tsx) ─────────────────────────────────
function downloadRouteQR(routeName: string, routeId: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 200, 200)
  ctx.fillStyle = '#000000'
  const data = routeName + routeId
  for (let i = 0; i < 20; i++)
    for (let j = 0; j < 20; j++)
      if ((data.charCodeAt((i * 20 + j) % data.length) + i + j) % 2 === 0)
        ctx.fillRect(i * 10, j * 10, 10, 10)
  const fc = (x: number, y: number) => {
    ctx.fillRect(x, y, 70, 10)
    ctx.fillRect(x, y, 10, 70)
    ctx.fillRect(x + 60, y, 10, 70)
    ctx.fillRect(x, y + 60, 70, 10)
  }
  fc(0, 0); fc(130, 0); fc(0, 130)
  const link = document.createElement('a')
  link.download = `route-qr-${routeName.replace(/\s+/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ─── Schedule timing helper ───────────────────────────────────────────────────
const MORNING_START = '6:45 AM'
const MORNING_END = '8:30 AM'
const EVENING_START = '2:30 PM'
const EVENING_END = '4:00 PM'

function interpolateTimes(stops: Stop[], startTime: string, endTime: string): string[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [startTime]

  // Convert "6:45 AM" -> minutes since midnight
  function toMinutes(t: string): number {
    const [timePart, period] = t.split(' ')
    const [h, m] = timePart.split(':').map(Number)
    const hours = period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h
    return hours * 60 + m
  }
  function fromMinutes(mins: number): string {
    const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
  }

  const startMins = toMinutes(startTime)
  const endMins = toMinutes(endTime)
  return stops.map((_, idx) => {
    const frac = stops.length === 1 ? 0 : idx / (stops.length - 1)
    return fromMinutes(Math.round(startMins + frac * (endMins - startMins)))
  })
}

// ─── Stop Accordion Card ──────────────────────────────────────────────────────
interface StopAccordionProps {
  stop: Stop
  orderNumber: number
  studentsAtStop: Array<{ id: string; name: string; class: string; division: string; is_active: boolean }>
}

function StopAccordion({ stop, orderNumber, studentsAtStop }: StopAccordionProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]/40 transition-colors"
      >
        {/* Order badge */}
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
          {orderNumber}
        </span>
        <CircleDot size={15} className="flex-shrink-0 text-[var(--primary)]" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{stop.name}</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {studentsAtStop.length} student{studentsAtStop.length !== 1 ? 's' : ''}
          </p>
        </div>
        {stop.estimated_time && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] tabular-nums flex-shrink-0">
            <Clock size={11} /> {stop.estimated_time}
          </span>
        )}
        {open ? <ChevronUp size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {studentsAtStop.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-2">No students at this stop</p>
          ) : (
            <ul className="space-y-2">
              {studentsAtStop.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-[11px] font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      {getInitials(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{s.name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">Class {s.class}{s.division}</p>
                  </div>
                  <Badge
                    className={`text-[10px] flex-shrink-0 ${
                      s.is_active
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Route Detail Page ────────────────────────────────────────────────────────
export default function RouteDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const route = allRoutes.find((r) => r.id === id)

  // Local active toggle
  const [isActive, setIsActive] = useState(route?.is_active ?? false)

  if (!route) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <MapPin size={40} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-[var(--foreground)]">Route not found</p>
          <Button variant="outline" onClick={() => navigate('/school-admin/routes')}>
            <ArrowLeft size={15} /> Back to Routes
          </Button>
        </div>
      </Layout>
    )
  }

  const orderedStops = [...(route.stops ?? [])].sort((a, b) => a.order_index - b.order_index)

  // Assign students to stops (cycle through stops by index)
  const routeStudents = allStudents.filter(
    (s) => s.school_id === route.school_id && s.route_name === route.name,
  )
  const studentsByStop: Record<string, typeof routeStudents> = {}
  routeStudents.forEach((s, i) => {
    const stop = orderedStops[i % orderedStops.length]
    if (!stop) return
    if (!studentsByStop[stop.id]) studentsByStop[stop.id] = []
    studentsByStop[stop.id].push(s)
  })

  // Ensure at least 2–3 mock students per stop when routeStudents is small
  const globalStudents = allStudents.filter((s) => s.school_id === route.school_id)
  orderedStops.forEach((stop, i) => {
    if (!studentsByStop[stop.id] || studentsByStop[stop.id].length === 0) {
      const pick = globalStudents.slice(i * 2, i * 2 + 3)
      if (pick.length > 0) studentsByStop[stop.id] = pick
    }
  })

  const totalStudents = routeStudents.length || route.student_count || 0

  // Schedule timings
  const morningTimes = interpolateTimes(orderedStops, MORNING_START, MORNING_END)
  const eveningTimes = interpolateTimes(orderedStops, EVENING_START, EVENING_END)

  return (
    <Layout>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <PageHeader
        title={route.name}
        subtitle={`${route.start_point} → ${route.end_point}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/school-admin/routes')}>
              <ArrowLeft size={15} /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadRouteQR(route.name, route.id)}
            >
              <QrCode size={15} /> Download QR
            </Button>
            {/* Active / Inactive toggle badge */}
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className="focus:outline-none"
              title="Toggle route active state"
            >
              <StatusBadge status={isActive ? 'active' : 'inactive'} />
            </button>
            {/* Type badge */}
            <Badge
              className={`capitalize font-semibold px-3 py-1 ${
                route.type === 'pickup'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                  : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
              }`}
            >
              {route.type}
            </Badge>
          </div>
        }
      />

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {[
          { label: 'Total Students', value: totalStudents, icon: Users },
          { label: 'Bus Number', value: route.bus_number ?? '—', icon: BusIcon },
          { label: 'Driver', value: route.driver_name ? route.driver_name.split(' ')[0] : '—', icon: User },
          { label: 'Total Stops', value: orderedStops.length, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <motion.div key={label} variants={fadeUp}>
            <Card>
              <CardContent className="flex items-center gap-3 pt-5 pb-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <Icon size={19} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
                  <p className="truncate text-lg font-bold text-[var(--foreground)]">{value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stops">Stops &amp; Students</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">

            {/* Route info card */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Route Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Start → End */}
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--muted)]/40 p-4">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <Navigation size={16} className="text-[var(--primary)]" />
                      <div className="h-10 w-0.5 bg-gradient-to-b from-[var(--primary)] to-green-500 rounded-full" />
                      <MapPin size={16} className="text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">Start Point</p>
                        <p className="font-semibold text-[var(--foreground)] truncate">{route.start_point}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">End Point</p>
                        <p className="font-semibold text-[var(--foreground)] truncate">{route.end_point}</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Type</p>
                      <p className="mt-0.5 text-sm font-semibold capitalize text-[var(--foreground)]">{route.type}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Bus</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{route.bus_number ?? '—'}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5 col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Driver</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{route.driver_name ?? '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Map placeholder + active trip */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4">
              {/* Map placeholder */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-base">Live Map View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)]"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 60%), linear-gradient(135deg, var(--muted), var(--background))',
                    }}
                  >
                    {/* Grid overlay */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <defs>
                        <pattern id="detail-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#detail-grid)" />
                      <path
                        d="M 40 180 Q 140 100 240 140 T 440 60"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        strokeDasharray="8 5"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                    </svg>
                    {/* Stop dots */}
                    {orderedStops.slice(0, 4).map((stop, i) => (
                      <div
                        key={stop.id}
                        className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)] shadow-lg"
                        style={{ left: `${12 + i * 22}%`, top: `${58 - i * 12}%` }}
                      >
                        {i + 1}
                      </div>
                    ))}
                    {/* Center label */}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--card)] shadow-lg border border-[var(--border)]">
                        <MapPin size={22} className="text-[var(--primary)]" />
                      </div>
                      <p className="text-xs font-medium text-[var(--muted-foreground)]">Live map view</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]/70">{orderedStops.length} stops on this route</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active trip info */}
              {route.bus_number && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 flex-shrink-0">
                        <BusIcon size={17} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--foreground)]">
                          {route.bus_number} · {route.driver_name ?? 'No driver assigned'}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">Assigned to this route</p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-[10px]">
                        Assigned
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ── Stops & Students Tab ─────────────────────────────────────── */}
        <TabsContent value="stops">
          <motion.div variants={container} initial="hidden" animate="show">
            {orderedStops.length === 0 ? (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                    <MapPin size={32} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
                    <p className="text-sm text-[var(--muted-foreground)]">No stops configured for this route yet.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {/* Start marker */}
                <motion.div variants={fadeUp} className="flex items-center gap-3 px-1">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
                    <Navigation size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">Start</p>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{route.start_point}</p>
                  </div>
                </motion.div>

                {orderedStops.map((stop, idx) => (
                  <motion.div key={stop.id} variants={fadeUp}>
                    <StopAccordion
                      stop={stop}
                      orderNumber={idx + 1}
                      studentsAtStop={studentsByStop[stop.id] ?? []}
                    />
                  </motion.div>
                ))}

                {/* End marker */}
                <motion.div variants={fadeUp} className="flex items-center gap-3 px-1">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Destination</p>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{route.end_point}</p>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ── Schedule Tab ─────────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">

            {/* Morning schedule */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    Morning Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-1">
                    {/* Vertical line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-500 via-amber-400/40 to-amber-300/10" />
                    <ul className="space-y-4">
                      {/* Departure */}
                      <li className="relative flex items-center gap-3">
                        <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                          <Navigation size={11} />
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Departure</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">{route.start_point}</p>
                          </div>
                          <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                            {MORNING_START}
                          </span>
                        </div>
                      </li>

                      {/* Stops */}
                      {orderedStops.map((stop, idx) => (
                        <li key={stop.id} className="relative flex items-center gap-3">
                          <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-[var(--card)]">
                            <CircleDot size={9} className="text-amber-500" />
                          </span>
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{stop.name}</p>
                            <span className="flex-shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
                              {morningTimes[idx] ?? '—'}
                            </span>
                          </div>
                        </li>
                      ))}

                      {/* Arrival */}
                      <li className="relative flex items-center gap-3">
                        <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                          <MapPin size={11} />
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Arrival</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">{route.end_point}</p>
                          </div>
                          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-green-700 dark:text-green-400">
                            {MORNING_END}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Evening schedule */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Evening Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-1">
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-500 via-indigo-400/40 to-indigo-300/10" />
                    <ul className="space-y-4">
                      {/* Departure */}
                      <li className="relative flex items-center gap-3">
                        <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm">
                          <Navigation size={11} />
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Departure</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">{route.start_point}</p>
                          </div>
                          <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                            {EVENING_START}
                          </span>
                        </div>
                      </li>

                      {/* Stops */}
                      {orderedStops.map((stop, idx) => (
                        <li key={stop.id} className="relative flex items-center gap-3">
                          <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-500 bg-[var(--card)]">
                            <CircleDot size={9} className="text-indigo-500" />
                          </span>
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{stop.name}</p>
                            <span className="flex-shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
                              {eveningTimes[idx] ?? '—'}
                            </span>
                          </div>
                        </li>
                      ))}

                      {/* Arrival */}
                      <li className="relative flex items-center gap-3">
                        <span className="relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                          <MapPin size={11} />
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Arrival</p>
                            <p className="text-sm font-medium text-[var(--foreground)]">{route.end_point}</p>
                          </div>
                          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-green-700 dark:text-green-400">
                            {EVENING_END}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </motion.div>
        </TabsContent>
      </Tabs>
    </Layout>
  )
}
