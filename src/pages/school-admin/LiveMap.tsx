import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import {
  Bus as BusIcon, Search, Gauge, Clock, MapPin, Navigation,
  Wifi, WifiOff, CircleDot, Radio,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { mockBuses, mockRoutes } from '@/lib/mockData'
import type { Bus } from '@/types'

// Must be defined outside component to avoid re-renders
const GOOGLE_MAP_LIBRARIES: ['places'] = ['places']

const GOOGLE_MAPS_API_KEY = 'import.meta.env.VITE_GOOGLE_MAPS_API_KEY'

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 }

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

type StatusFilter = 'all' | 'running' | 'idle' | 'offline'

// Telemetry data keyed by bus id
const BUS_TELEMETRY: Record<string, { speed: number; eta: string }> = {
  bus_001: { speed: 42, eta: '8 min' },
  bus_002: { speed: 36, eta: '14 min' },
  bus_003: { speed: 0, eta: '—' },
  bus_004: { speed: 0, eta: 'Offline' },
}
const FALLBACK_TELEMETRY = { speed: 0, eta: '—' }

// Map bus id -> first stop of its assigned route for position
const getBusPosition = (busId: string): google.maps.LatLngLiteral | null => {
  const route = mockRoutes.find((r) => r.bus_id === busId && r.school_id === 'sch_001')
  if (!route || !route.stops || route.stops.length === 0) return null
  const stop = route.stops[0]
  return { lat: stop.latitude, lng: stop.longitude }
}

const STATUS_DOT: Record<string, string> = {
  running: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-gray-400',
}

function StatStrip({ label, value, icon: Icon, dot }: {
  label: string
  value: string | number
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
  const [selectedBusId, setSelectedBusId] = useState<string | null>('bus_001')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [now, setNow] = useState(new Date())

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const schoolBuses = useMemo(
    () => mockBuses.filter((b) => b.school_id === 'sch_001'),
    [],
  )

  const counts = useMemo(() => {
    const running = schoolBuses.filter((b) => b.status === 'running').length
    const idle = schoolBuses.filter((b) => b.status === 'idle').length
    const offline = schoolBuses.filter((b) => b.status === 'offline').length
    const live = schoolBuses.filter((b) => b.status === 'running')
    const avgSpeed = live.length
      ? Math.round(live.reduce((s, b) => s + (BUS_TELEMETRY[b.id]?.speed ?? 0), 0) / live.length)
      : 0
    return { running, idle, offline, avgSpeed }
  }, [schoolBuses])

  const filteredBuses = useMemo(() => {
    return schoolBuses.filter((b) => {
      const matchesFilter = filter === 'all' || b.status === filter
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        b.bus_number.toLowerCase().includes(q) ||
        (b.driver_name ?? '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [schoolBuses, search, filter])

  const selectedBus = useMemo(
    () => schoolBuses.find((b) => b.id === selectedBusId) ?? null,
    [schoolBuses, selectedBusId],
  )

  const selectedBusPosition = useMemo(
    () => (selectedBusId ? getBusPosition(selectedBusId) : null),
    [selectedBusId],
  )

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
          <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Main two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* LEFT — Google Map panel */}
        <div className="h-[500px] rounded-2xl overflow-hidden border border-[var(--border)]">
          {!isLoaded ? (
            /* Loading skeleton */
            <div className="flex h-full w-full animate-pulse flex-col gap-3 rounded-2xl bg-[var(--muted)] p-6">
              <div className="h-6 w-1/3 rounded-lg bg-[var(--border)]" />
              <div className="flex-1 rounded-xl bg-[var(--border)]" />
              <div className="h-4 w-1/2 rounded-lg bg-[var(--border)]" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={DUBAI_CENTER}
              zoom={12}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {filteredBuses.map((bus) => {
                const position = getBusPosition(bus.id)
                if (!position) return null
                return (
                  <Marker
                    key={bus.id}
                    position={position}
                    title={`${bus.bus_number} — ${bus.driver_name ?? 'No driver'}`}
                    onClick={() => setSelectedBusId(bus.id === selectedBusId ? null : bus.id)}
                  />
                )
              })}

              {selectedBus && selectedBusPosition && (
                <InfoWindow
                  position={selectedBusPosition}
                  onCloseClick={() => setSelectedBusId(null)}
                >
                  <div className="min-w-[140px] p-1 text-sm">
                    <p className="font-bold text-gray-800">{selectedBus.bus_number}</p>
                    <p className="text-gray-600">{selectedBus.driver_name ?? 'No driver'}</p>
                    {selectedBus.current_stop && (
                      <p className="mt-1 text-xs text-gray-500">{selectedBus.current_stop}</p>
                    )}
                    <p className="mt-1 text-xs font-medium capitalize text-gray-700">
                      Status: {selectedBus.status ?? 'unknown'}
                    </p>
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

          <div className="flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-[500px]">
            {filteredBuses.length === 0 ? (
              <div className="py-12 text-center">
                <WifiOff size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" strokeWidth={1.5} />
                <p className="text-sm text-[var(--muted-foreground)]">No buses match your filter.</p>
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const telemetry = BUS_TELEMETRY[bus.id] ?? FALLBACK_TELEMETRY
                const status = bus.status ?? 'offline'
                const isSelected = selectedBusId === bus.id
                return (
                  <motion.button
                    key={bus.id}
                    layout
                    onClick={() => setSelectedBusId(isSelected ? null : bus.id)}
                    whileHover={{ x: 2 }}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', STATUS_DOT[status], status === 'running' && 'animate-pulse')} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--foreground)]">{bus.bus_number}</p>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">{bus.driver_name ?? 'No driver'}</p>
                        </div>
                      </div>
                      <StatusBadge status={status} size="sm" />
                    </div>

                    <div className="mt-2.5 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Gauge size={12} className="text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)] tabular-nums">{telemetry.speed}</span> km/h
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-[var(--primary)]" />
                        ETA <span className="font-medium text-[var(--foreground)]">{telemetry.eta}</span>
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        {status === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} className="text-green-500" />}
                      </span>
                    </div>

                    {bus.current_stop && (
                      <p className="mt-2 flex items-center gap-1 truncate text-xs text-[var(--muted-foreground)]">
                        <MapPin size={12} className="flex-shrink-0 text-[var(--primary)]" />
                        {bus.current_stop}
                      </p>
                    )}
                  </motion.button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
