import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import {
  Bus as BusIcon, Search, Gauge, Clock, MapPin, Navigation,
  Wifi, WifiOff, CircleDot, Radio, ExternalLink, Users,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { mockBuses, mockRoutes } from '@/lib/mockData'
import type { Bus } from '@/types'

// Must be defined outside component to avoid re-renders
const GOOGLE_MAP_LIBRARIES: ['places'] = ['places']
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 }
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

type StatusFilter = 'all' | 'running' | 'idle'

const BUS_TELEMETRY: Record<string, { speed: number; eta: string; startTime: string; onboarding: number }> = {
  bus_001: { speed: 42, eta: '8 min', startTime: '7:00 AM', onboarding: 22 },
  bus_002: { speed: 36, eta: '14 min', startTime: '7:15 AM', onboarding: 18 },
  bus_003: { speed: 0, eta: '—', startTime: '—', onboarding: 0 },
  bus_004: { speed: 0, eta: 'Offline', startTime: '—', onboarding: 0 },
}
const FALLBACK_TELEMETRY = { speed: 0, eta: '—', startTime: '—', onboarding: 0 }

const STATUS_DOT: Record<string, string> = {
  running: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-gray-400',
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

function getBusPosition(busId: string): google.maps.LatLngLiteral | null {
  const route = mockRoutes.find((r) => r.bus_id === busId && r.school_id === 'sch_001')
  if (!route?.stops?.length) return null
  const stop = route.stops[0]
  return { lat: stop.latitude, lng: stop.longitude }
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
  const [selectedBusId, setSelectedBusId] = useState<string | null>('bus_001')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [now, setNow] = useState(new Date())
  const dayMeta = useMemo(() => makeDayMeta(), [])

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const schoolBuses = useMemo(() => mockBuses.filter((b) => b.school_id === 'sch_001'), [])

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
      const matchesFilter =
        filter === 'all' || b.status === filter
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

  const getOccupancy = (bus: Bus) => {
    if (bus.status === 'running') return Math.round(bus.seat_capacity * 0.7)
    return 0
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

      {/* Main two-column layout */}
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
              center={selectedBusPosition ?? DUBAI_CENTER}
              zoom={selectedBusPosition ? 14 : 12}
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
                  <div className="min-w-[160px] p-1 text-sm">
                    <p className="font-bold text-gray-800">{selectedBus.bus_number}</p>
                    <p className="text-gray-600">{selectedBus.driver_name ?? 'No driver'}</p>
                    <p className="mt-1 text-xs font-medium capitalize text-gray-700">
                      Status: {selectedBus.status ?? 'unknown'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      On board: {getOccupancy(selectedBus)} students
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
                const telemetry = BUS_TELEMETRY[bus.id] ?? FALLBACK_TELEMETRY
                const status = bus.status ?? 'offline'
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
                          <span>Start: <span className="font-medium text-[var(--foreground)]">{telemetry.startTime}</span></span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Users size={11} className="flex-shrink-0 text-[var(--primary)]" />
                          <span><span className="font-medium text-[var(--foreground)]">{telemetry.onboarding}</span> on board</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Gauge size={12} className="text-[var(--primary)]" />
                          <span className="font-medium text-[var(--foreground)] tabular-nums">{telemetry.speed}</span> km/h
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-[var(--primary)]" />
                          ETA <span className="font-medium text-[var(--foreground)]">{telemetry.eta}</span>
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
    </Layout>
  )
}
