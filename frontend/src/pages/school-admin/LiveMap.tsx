import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Polyline } from '@react-google-maps/api'
import {
  Bus as BusIcon, Search, Gauge, Clock, MapPin, Navigation,
  Wifi, WifiOff, CircleDot, Radio, ExternalLink, Users, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { listBuses, getBusLocation } from '@/lib/api/buses'
import { getTripPath } from '@/lib/api/trips'
import { getSocket, type BusLocationEvent, type TripStatusEvent } from '@/lib/socket'
import { useAppSelector } from '@/store/hooks'
import type { Bus, BusLocation } from '@/types'

// Must be defined outside component to avoid re-renders
const GOOGLE_MAP_LIBRARIES: ['places'] = ['places']
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 }
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

type StatusFilter = 'all' | 'running' | 'idle'


const STATUS_DOT: Record<string, string> = {
  running: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-gray-400',
}

const STATUS_MARKER_COLOR: Record<string, string> = {
  running: '#22c55e',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

/** Pin-shaped bus glyph, tinted by status, for the Live Map markers — shows
 * just an icon + bus number; full details stay behind the click-to-open
 * InfoWindow so the map itself doesn't get cluttered with driver/status text. */
function busMarkerIcon(status: string): string {
  const color = STATUS_MARKER_COLOR[status] ?? STATUS_MARKER_COLOR.offline
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
      <g transform="translate(8,8) scale(0.83)" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6v6"/>
        <path d="M15 6v6"/>
        <path d="M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
        <circle cx="7" cy="18" r="2"/>
        <path d="M9 18h5"/>
        <circle cx="16" cy="18" r="2"/>
      </g>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TODAY = toLocalDateStr(new Date())

function makeDayMeta() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return { date: toLocalDateStr(d), dot: (i % 4 === 2 ? 'amber' : 'green') as 'green' | 'amber' }
  })
}

function StatStrip({ label, value, icon: Icon, dot }: {
  label: string; value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  dot?: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
        <Icon size={15} className="text-[var(--primary)]" />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
          {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
          {label}
        </p>
        <p className="text-base font-bold leading-tight text-[var(--foreground)] tabular-nums">{value}</p>
      </div>
    </div>
  )
}

export default function LiveMap() {
  const navigate = useNavigate()
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [now, setNow] = useState(new Date())
  const [liveLocations, setLiveLocations] = useState<Record<string, BusLocationEvent>>({})
  // Authoritative status pushed the instant a trip starts/ends via REST —
  // doesn't wait on a GPS ping, which may never arrive right as a trip ends.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'running' | 'idle'>>({})
  const dayMeta = useMemo(() => makeDayMeta(), [])

  // Traveled-route polylines are a standard/premium-plan feature.
  const user = useAppSelector((state) => state.auth.user)
  const canShowPolylines = user?.plan_type === 'standard' || user?.plan_type === 'premium'

  // Per-bus trail of the current trip's path: the first point recorded is the
  // start point, points accumulate live while running, and whatever arrives
  // with status "completed" becomes the frozen stop point.
  const [trails, setTrails] = useState<Record<string, { tripId: string; points: google.maps.LatLngLiteral[] }>>({})

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Fleet list (real REST data, scoped to this school via the JWT) ─────────
  const busesQuery = useQuery({
    queryKey: ['buses'],
    queryFn: () => listBuses({ is_active: true }),
  })
  const schoolBuses = useMemo(() => busesQuery.data?.buses ?? [], [busesQuery.data])

  // ── Initial "last known" position per bus (REST fallback) ──────────────────
  const busLocationQueries = useQueries({
    queries: schoolBuses.map((bus) => ({
      queryKey: ['busLocation', bus.id],
      queryFn: () => getBusLocation(bus.id),
      // onboard_count isn't pushed over the bus:location socket (only
      // lat/lng/speed/status are), so this REST fallback needs to keep
      // polling to stay reasonably current.
      refetchInterval: 15000,
    })),
  })

  const initialLocations = useMemo(() => {
    const map: Record<string, BusLocation> = {}
    schoolBuses.forEach((bus, i) => {
      const loc = busLocationQueries[i]?.data
      if (loc) map[bus.id] = loc
    })
    return map
  }, [schoolBuses, busLocationQueries])

  // ── Live GPS push updates over Socket.IO ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    function handleBusLocation(event: BusLocationEvent) {
      setLiveLocations((prev) => ({ ...prev, [event.bus_id]: event }))

      if (!canShowPolylines) return
      setTrails((prev) => {
        const point = { lat: event.latitude, lng: event.longitude }
        const existing = prev[event.bus_id]
        // A different (or first-seen) trip_id means a new trip just started —
        // this ping's position is that trip's start point, so the trail restarts.
        const points = existing?.tripId === event.trip_id ? [...existing.points, point] : [point]
        return { ...prev, [event.bus_id]: { tripId: event.trip_id, points } }
      })
    }
    socket.on('bus:location', handleBusLocation)
    return () => {
      socket.off('bus:location', handleBusLocation)
    }
  }, [canShowPolylines])

  // ── Immediate trip-start/trip-end status push (see TripStatusEvent) ────────
  useEffect(() => {
    const socket = getSocket()
    function handleTripStatus(event: TripStatusEvent) {
      if (event.status !== 'in_progress' && event.status !== 'completed') return
      setStatusOverrides((prev) => ({
        ...prev,
        [event.bus_id]: event.status === 'completed' ? 'idle' : 'running',
      }))
    }
    socket.on('trip:status', handleTripStatus)
    return () => {
      socket.off('trip:status', handleTripStatus)
    }
  }, [])

  // ── Seed each running bus's trail with its full recorded path, so opening
  // the map mid-trip shows the route traveled so far, not just new pings ─────
  const seededTripsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!canShowPolylines) return
    Object.values(initialLocations).forEach((loc) => {
      if (loc.status !== 'in_progress') return
      const key = `${loc.bus_id}:${loc.trip_id}`
      if (seededTripsRef.current.has(key)) return
      seededTripsRef.current.add(key)

      getTripPath(loc.trip_id).then((points) => {
        setTrails((current) => {
          // Don't clobber a trail the socket has already grown past this snapshot.
          if (current[loc.bus_id]?.tripId === loc.trip_id && current[loc.bus_id].points.length > points.length) {
            return current
          }
          return {
            ...current,
            [loc.bus_id]: {
              tripId: loc.trip_id,
              points: points.map((p) => ({ lat: p.latitude, lng: p.longitude })),
            },
          }
        })
      })
    })
  }, [initialLocations, canShowPolylines])

  function getBusPosition(busId: string): google.maps.LatLngLiteral | null {
    const live = liveLocations[busId]
    if (live) return { lat: live.latitude, lng: live.longitude }
    const initial = initialLocations[busId]
    if (initial) return { lat: initial.latitude, lng: initial.longitude }
    return null
  }

  /** A live bus:location ping (trip status not_started/in_progress/completed)
   * is fresher than the REST snapshot's bus.status (running/idle/offline)
   * fetched once on mount — same mapping the backend socket handler applies
   * when it updates buses.status, so the two stay consistent. */
  function getEffectiveStatus(bus: Bus): string {
    const override = statusOverrides[bus.id]
    if (override) return override
    const live = liveLocations[bus.id]
    if (live) return live.status === 'completed' ? 'idle' : 'running'
    return bus.status ?? 'offline'
  }

  function getEffectiveSpeed(bus: Bus): number {
    const live = liveLocations[bus.id]
    if (live) return Math.round(live.speed)
    return 0
  }

  const counts = useMemo(() => {
    const running = schoolBuses.filter((b) => getEffectiveStatus(b) === 'running').length
    const idle = schoolBuses.filter((b) => getEffectiveStatus(b) === 'idle').length
    const offline = schoolBuses.filter((b) => getEffectiveStatus(b) === 'offline').length
    const live = schoolBuses.filter((b) => getEffectiveStatus(b) === 'running')
    const avgSpeed = live.length
      ? Math.round(live.reduce((s, b) => s + getEffectiveSpeed(b), 0) / live.length)
      : 0
    return { running, idle, offline, avgSpeed }
  }, [schoolBuses, liveLocations, statusOverrides])

  const filteredBuses = useMemo(() => {
    return schoolBuses.filter((b) => {
      const matchesFilter =
        filter === 'all' || getEffectiveStatus(b) === filter
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        b.bus_number.toLowerCase().includes(q) ||
        (b.driver_name ?? '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [schoolBuses, search, filter, liveLocations, statusOverrides])

  const selectedBus = useMemo(
    () => schoolBuses.find((b) => b.id === selectedBusId) ?? null,
    [schoolBuses, selectedBusId],
  )

  const selectedBusPosition = useMemo(
    () => (selectedBusId ? getBusPosition(selectedBusId) : null),
    [selectedBusId, liveLocations, initialLocations],
  )

  // Map view is intentionally decoupled from selectedBusPosition: it only
  // moves when a *different* bus is actively selected (selectedBusId
  // changes), not on every GPS tick of the currently-selected bus, and it
  // never snaps back to the Dubai default just because the popup was closed.
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DUBAI_CENTER)
  const [mapZoom, setMapZoom] = useState(12)
  useEffect(() => {
    if (!selectedBusId) return
    const position = getBusPosition(selectedBusId)
    if (position) {
      setMapCenter(position)
      setMapZoom(14)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusId])

  const getOccupancy = (bus: Bus) => initialLocations[bus.id]?.onboard_count ?? 0

  const getStartTime = (bus: Bus) => {
    const startedAt = initialLocations[bus.id]?.started_at
    if (!startedAt) return '—'
    return new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getEta = (bus: Bus) => {
    if (getEffectiveStatus(bus) !== 'running') return '—'
    const minutes = initialLocations[bus.id]?.eta_minutes
    if (minutes == null) return '—'
    if (minutes < 1) return '<1 min'
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`
  }

  const FILTER_PILLS: { label: string; value: StatusFilter; dot: string; count: number }[] = [
    { label: 'All', value: 'all', dot: 'bg-[var(--muted-foreground)]', count: schoolBuses.length },
    { label: 'Running', value: 'running', dot: 'bg-green-500', count: counts.running },
    { label: 'Idle', value: 'idle', dot: 'bg-amber-500', count: counts.idle },
  ]

  return (
    <Layout>
      {/* Top bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
            Live Map
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Radio size={11} className="animate-pulse" /> Live
            </span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Real-time fleet tracking console</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bus or driver…"
              className="pl-9"
            />
          </div>
          <div className="hidden items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] tabular-nums md:flex">
            <Clock size={14} className="text-[var(--primary)]" />
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatStrip label="On Route" value={counts.running} icon={Navigation} dot="bg-green-500" />
        <StatStrip label="Idle" value={counts.idle} icon={CircleDot} dot="bg-amber-500" />
        <StatStrip label="Offline" value={counts.offline} icon={WifiOff} dot="bg-gray-400" />
        <StatStrip label="Avg Speed" value={`${counts.avgSpeed} km/h`} icon={Gauge} />
      </div>

      {/* Horizontal Calendar */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          <HorizontalCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dayMeta={dayMeta}
          />
        </CardContent>
      </Card>

      {/* Filter pills */}
      <div className="mb-4 flex items-center gap-2">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setFilter(pill.value)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === pill.value
                ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/60',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', pill.dot, filter === pill.value ? 'bg-white/80' : '')} />
            {pill.label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-semibold',
              filter === pill.value ? 'bg-white/20 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]',
            )}>
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {busesQuery.isError && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load the fleet. Please try again.
        </div>
      )}

      {busesQuery.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
      /* Main two-column layout */
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* LEFT — Map */}
        <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ height: '480px' }}>
          {!isLoaded ? (
            <div className="flex h-full w-full animate-pulse flex-col gap-3 rounded-2xl bg-[var(--muted)] p-6">
              <div className="h-6 w-1/3 rounded-lg bg-[var(--border)]" />
              <div className="flex-1 rounded-xl bg-[var(--border)]" />
              <div className="h-4 w-1/2 rounded-lg bg-[var(--border)]" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={mapCenter}
              zoom={mapZoom}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {canShowPolylines && filteredBuses.map((bus) => {
                const trail = trails[bus.id]
                if (!trail || trail.points.length < 2) return null
                return (
                  <Polyline
                    key={`trail-${bus.id}-${trail.tripId}`}
                    path={trail.points}
                    options={{
                      strokeColor: STATUS_MARKER_COLOR[getEffectiveStatus(bus)] ?? '#4b1e99',
                      strokeOpacity: 0.85,
                      strokeWeight: 3,
                    }}
                  />
                )
              })}

              {filteredBuses.map((bus) => {
                const position = getBusPosition(bus.id)
                if (!position) return null
                return (
                  <Marker
                    key={bus.id}
                    position={position}
                    title={bus.bus_number}
                    icon={{
                      url: busMarkerIcon(getEffectiveStatus(bus)),
                      scaledSize: new google.maps.Size(36, 36),
                      anchor: new google.maps.Point(18, 18),
                      labelOrigin: new google.maps.Point(18, 45),
                    }}
                    label={{
                      text: bus.bus_number,
                      color: '#1f2937',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                    onClick={() => setSelectedBusId(bus.id === selectedBusId ? null : bus.id)}
                  />
                )
              })}

              {selectedBus && selectedBusPosition && (
                <InfoWindow
                  position={selectedBusPosition}
                  onCloseClick={() => setSelectedBusId(null)}
                >
                  <div className="min-w-[160px] p-1 text-sm">
                    <p className="font-bold text-gray-800">{selectedBus.bus_number}</p>
                    <p className="text-gray-600">{selectedBus.driver_name ?? 'No driver'}</p>
                    <p className="mt-1 text-xs font-medium capitalize text-gray-700">
                      Status: {getEffectiveStatus(selectedBus)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Speed: {getEffectiveSpeed(selectedBus)} km/h
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      On board: {getOccupancy(selectedBus)} students
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Start: {getStartTime(selectedBus)}
                    </p>
                    <button
                      onClick={() => navigate(`/school-admin/buses/${selectedBus.id}`)}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Details <ExternalLink size={10} />
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* RIGHT — bus list sidebar */}
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <BusIcon size={16} className="text-[var(--primary)]" />
              Fleet
            </h3>
            <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
              {filteredBuses.length} bus{filteredBuses.length === 1 ? '' : 'es'}
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-[440px]">
            {filteredBuses.length === 0 ? (
              <div className="py-12 text-center">
                <WifiOff size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" strokeWidth={1.5} />
                <p className="text-sm text-[var(--muted-foreground)]">No buses match your filter.</p>
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const status = getEffectiveStatus(bus)
                const speed = getEffectiveSpeed(bus)
                const isSelected = selectedBusId === bus.id
                return (
                  <motion.div
                    key={bus.id}
                    layout
                    className={cn(
                      'rounded-xl border transition-colors',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/40',
                    )}
                  >
                    {/* Click the card body to focus on map */}
                    <button
                      className="w-full p-3 text-left"
                      onClick={() => setSelectedBusId(isSelected ? null : bus.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', STATUS_DOT[status] ?? 'bg-gray-400', status === 'running' && 'animate-pulse')} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--foreground)]">{bus.bus_number}</p>
                            <p className="truncate text-xs text-[var(--muted-foreground)]">{bus.driver_name ?? 'No driver'}</p>
                          </div>
                        </div>
                        <StatusBadge status={status} size="sm" />
                      </div>

                      {/* Starting time + onboarding count */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Clock size={11} className="flex-shrink-0 text-[var(--primary)]" />
                          <span>Start: <span className="font-medium text-[var(--foreground)]">{getStartTime(bus)}</span></span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Users size={11} className="flex-shrink-0 text-[var(--primary)]" />
                          <span><span className="font-medium text-[var(--foreground)]">{getOccupancy(bus)}</span> on board</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Gauge size={12} className="text-[var(--primary)]" />
                          <span className="font-medium text-[var(--foreground)] tabular-nums">{speed}</span> km/h
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[var(--primary)]" />
                          ETA <span className="font-medium text-[var(--foreground)]">{getEta(bus)}</span>
                        </span>
                        <span className="ml-auto">
                          {status === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} className="text-green-500" />}
                        </span>
                      </div>

                      {bus.current_stop && (
                        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-[var(--muted-foreground)]">
                          <MapPin size={12} className="flex-shrink-0 text-[var(--primary)]" />
                          {bus.current_stop}
                        </p>
                      )}
                    </button>

                    {/* Footer action — navigate to bus inner page */}
                    <div className="border-t border-[var(--border)] px-3 py-2">
                      <button
                        onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                        className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        <ExternalLink size={11} /> View Bus Details
                      </button>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>
      )}
    </Layout>
  )
}
