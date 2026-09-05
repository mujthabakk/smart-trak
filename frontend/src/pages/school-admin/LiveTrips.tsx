import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bus as BusIcon, MapPin, Navigation, Users, Clock, ArrowRight } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getInitials, formatDate, cn } from '@/lib/utils'
import { listTrips, getBoardingStudents, type BoardingStudent } from '@/lib/api/trips'
import { getRoute } from '@/lib/api/routes'
import { getSocket, type TripStatusEvent } from '@/lib/socket'
import type { Trip, Stop } from '@/types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }

const STATUS_DOT: Record<BoardingStudent['status'], string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  leave: 'bg-amber-500',
  pending: 'bg-gray-300 dark:bg-gray-600',
}
const STATUS_LABEL: Record<BoardingStudent['status'], string> = {
  present: 'Boarded',
  absent: 'Absent',
  leave: 'On leave',
  pending: 'Not yet',
}
const STATUS_TIME_FIELD: Record<'pickup' | 'drop', keyof BoardingStudent> = {
  pickup: 'pickup_time',
  drop: 'drop_time',
}

// ─── Timeline: every stop on the route, in direction of travel, fully
// expanded (no click-to-open — an admin watching a live trip wants
// everything visible at once), with a bus marker riding the line at
// whichever stop attendance last confirmed — the "where is my train" view.
function TripTimeline({
  stops, tripType, startPoint, endPoint, roster, currentStop,
}: {
  stops: Stop[]
  tripType: 'pickup' | 'drop'
  startPoint: string
  endPoint: string
  roster: BoardingStudent[]
  currentStop?: string
}) {
  const orderedStops = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.order_index - b.order_index)
    return tripType === 'drop' ? sorted.reverse() : sorted
  }, [stops, tripType])

  const studentsByStopName = useMemo(() => {
    const map: Record<string, BoardingStudent[]> = {}
    roster.forEach((s) => {
      if (!s.stop_name) return
      ;(map[s.stop_name] ??= []).push(s)
    })
    return map
  }, [roster])

  // -1 (still at the start point) until the bus reaches its first stop.
  const currentIndex = currentStop ? orderedStops.findIndex((s) => s.name === currentStop) : -1
  const timeField = STATUS_TIME_FIELD[tripType]
  const displayStart = tripType === 'pickup' ? startPoint : endPoint
  const displayEnd = tripType === 'pickup' ? endPoint : startPoint

  function TimelineStudent({ s }: { s: BoardingStudent }) {
    const time = s[timeField] as string | undefined
    return (
      <li className="flex items-center gap-2 text-xs">
        <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', STATUS_DOT[s.status])} />
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[10px] font-bold text-[var(--primary)]">
          {getInitials(s.name)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">{s.name}</span>
        <span className="flex-shrink-0 text-[var(--muted-foreground)]">{STATUS_LABEL[s.status]}</span>
        {time && <span className="flex-shrink-0 tabular-nums text-[var(--muted-foreground)]">{formatDate(time, 'time')}</span>}
      </li>
    )
  }

  return (
    <div className="relative pl-1">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--primary)]/40 to-[var(--primary)]/10" />
      <ul className="space-y-4">
        {/* Start */}
        <li className="relative flex items-start gap-3">
          <span className={cn(
            'relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full shadow-sm',
            currentIndex === -1 ? 'bg-[var(--primary)] text-[var(--primary-foreground)] ring-4 ring-[var(--primary)]/25' : 'bg-[var(--primary)] text-[var(--primary-foreground)]',
          )}>
            {currentIndex === -1 ? <BusIcon size={11} /> : <Navigation size={11} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Start</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayStart}</p>
          </div>
        </li>

        {orderedStops.map((stop, idx) => {
          const studsAtStop = studentsByStopName[stop.name] ?? []
          const isCurrent = idx === currentIndex
          const isPassed = currentIndex > idx
          return (
            <li key={stop.id} className="relative">
              <div className="flex items-start gap-3">
                <span className={cn(
                  'relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-colors',
                  isCurrent
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] ring-4 ring-[var(--primary)]/25'
                    : isPassed
                    ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10'
                    : 'border-[var(--border)] bg-[var(--card)]',
                )}>
                  {isCurrent ? <BusIcon size={11} /> : <MapPin size={9} className={isPassed ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'} />}
                </span>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('truncate text-sm font-medium', isCurrent ? 'text-[var(--primary)]' : 'text-[var(--foreground)]')}>
                      {stop.name}
                    </p>
                    {studsAtStop.length === 0 && (
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">No students at this stop</p>
                    )}
                  </div>
                  {stop.estimated_time && (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] tabular-nums">
                      <Clock size={11} /> {stop.estimated_time}
                    </span>
                  )}
                </div>
              </div>
              {studsAtStop.length > 0 && (
                <ul className="ml-8 mt-1.5 space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
                  {studsAtStop.map((s) => <TimelineStudent key={s.id} s={s} />)}
                </ul>
              )}
            </li>
          )
        })}

        {/* Destination */}
        <li className="relative flex items-start gap-3">
          <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
            <MapPin size={11} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Destination</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayEnd}</p>
          </div>
        </li>
      </ul>
    </div>
  )
}

// ─── One live trip's card: bus/route header + attendance-derived current
// stop + a fully-expanded stop timeline with a moving bus marker ───────────
function TripCard({ trip }: { trip: Trip }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const rosterQuery = useQuery({
    queryKey: ['trip-roster', trip.id],
    queryFn: () => getBoardingStudents(trip.id),
    refetchInterval: 30000,
  })
  const roster = rosterQuery.data ?? []
  const boardedCount = roster.filter((s) => s.status === 'present').length

  const routeQuery = useQuery({
    queryKey: ['route', trip.route_id],
    queryFn: () => getRoute(trip.route_id),
  })

  // attendance:updated already carries this trip's id — refetch just this
  // card's roster (and the trip list, since current_stop lives there) rather
  // than every card on the page reacting to every mark anywhere in the school.
  useEffect(() => {
    const socket = getSocket()
    function handleAttendanceUpdated(event: { trip_id: string }) {
      if (event.trip_id !== trip.id) return
      queryClient.invalidateQueries({ queryKey: ['trip-roster', trip.id] })
      queryClient.invalidateQueries({ queryKey: ['trips', 'live'] })
    }
    socket.on('attendance:updated', handleAttendanceUpdated)
    return () => { socket.off('attendance:updated', handleAttendanceUpdated) }
  }, [trip.id, queryClient])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <BusIcon size={18} className="text-[var(--primary)]" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{trip.bus_number}</CardTitle>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{trip.route_name} · {trip.driver_name}</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'flex-shrink-0 text-xs',
              trip.trip_type === 'pickup'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            )}
          >
            {trip.trip_type === 'pickup' ? 'Morning' : 'Afternoon'}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 min-w-0 text-[var(--foreground)]">
            <MapPin size={14} className="flex-shrink-0 text-[var(--muted-foreground)]" />
            <span className="truncate">{trip.current_stop ?? 'Not reached a stop yet'}</span>
          </span>
          <span className="flex-shrink-0 flex items-center gap-1 tabular-nums font-semibold text-[var(--foreground)]">
            <Users size={13} className="text-[var(--muted-foreground)]" />
            {boardedCount}/{roster.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => navigate(`/school-admin/live-map?busId=${trip.bus_id}`)}
        >
          View on Map <ArrowRight size={13} />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {rosterQuery.isLoading || routeQuery.isLoading ? (
          <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
        ) : !routeQuery.data || routeQuery.data.stops.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">No stops configured for this route.</p>
        ) : (
          <TripTimeline
            stops={routeQuery.data.stops}
            tripType={trip.trip_type}
            startPoint={routeQuery.data.start_point}
            endPoint={routeQuery.data.end_point}
            roster={roster}
            currentStop={trip.current_stop}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default function LiveTrips() {
  const queryClient = useQueryClient()

  const tripsQuery = useQuery({
    queryKey: ['trips', 'live'],
    queryFn: () => listTrips({ status: 'in_progress' }),
    refetchInterval: 30000,
  })
  const trips = tripsQuery.data?.trips ?? []

  // A trip starting/ending changes which cards should exist on this page at
  // all — attendance:updated (handled per-card above) only refreshes a
  // trip already showing.
  useEffect(() => {
    const socket = getSocket()
    function handleTripStatus(event: TripStatusEvent) {
      if (event.status !== 'in_progress' && event.status !== 'completed') return
      queryClient.invalidateQueries({ queryKey: ['trips', 'live'] })
    }
    socket.on('trip:status', handleTripStatus)
    return () => { socket.off('trip:status', handleTripStatus) }
  }, [queryClient])

  return (
    <Layout>
      <PageHeader title="Live Trips" subtitle="Every bus on the road right now, with live boarding status per student." />

      {tripsQuery.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : trips.length === 0 ? (
        <Card>
          <EmptyState
            icon={BusIcon}
            title="No trips running"
            description="Once a driver starts a pickup or drop trip, it'll show up here with live boarding status."
          />
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {trips.map((trip) => (
            <motion.div key={trip.id} variants={item}>
              <TripCard trip={trip} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </Layout>
  )
}
