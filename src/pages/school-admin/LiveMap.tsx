import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
import { mockBuses } from '@/lib/mockData'
import type { Bus } from '@/types'

type StatusFilter = 'all' | 'running' | 'idle' | 'offline'

// Decorative marker positions + telemetry, keyed by bus id.
const MARKER_META: Record<string, { x: number; y: number; speed: number; eta: string }> = {
  bus_001: { x: 28, y: 38, speed: 42, eta: '8 min' },
  bus_002: { x: 62, y: 30, speed: 36, eta: '14 min' },
  bus_003: { x: 46, y: 64, speed: 0, eta: '—' },
  bus_004: { x: 78, y: 72, speed: 0, eta: 'Offline' },
}
const FALLBACK_META = { x: 50, y: 50, speed: 0, eta: '—' }

const STATUS_DOT: Record<string, string> = {
  running: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-gray-400',
}
const STATUS_RING: Record<string, string> = {
  running: 'bg-green-500/40',
  idle: 'bg-amber-500/40',
  offline: 'bg-gray-400/30',
}

function BusMarker({
  bus, selected, onSelect,
}: {
  bus: Bus
  selected: boolean
  onSelect: () => void
}) {
  const meta = MARKER_META[bus.id] ?? FALLBACK_META
  const status = bus.status ?? 'offline'
  const isLive = status === 'running'

  return (
    <button
      onClick={onSelect}
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
      aria-label={`Bus ${bus.bus_number}`}
    >
      {/* pulsing ring for live buses */}
      {isLive && (
        <motion.span
          className={cn('absolute inset-0 -z-10 rounded-full', STATUS_RING[status])}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <motion.div
        whileHover={{ scale: 1.15 }}
        animate={selected ? { scale: 1.2 } : { scale: 1 }}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg dark:border-[var(--card)]',
          STATUS_DOT[status],
          selected && 'ring-4 ring-[var(--primary)]/40',
        )}
      >
        <BusIcon size={16} className="text-white" />
      </motion.div>
      {selected && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-0.5 text-[10px] font-semibold text-[var(--background)] shadow">
          {bus.bus_number}
        </div>
      )}
    </button>
  )
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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const counts = useMemo(() => {
    const running = mockBuses.filter((b) => b.status === 'running').length
    const idle = mockBuses.filter((b) => b.status === 'idle').length
    const offline = mockBuses.filter((b) => b.status === 'offline').length
    const live = mockBuses.filter((b) => b.status === 'running')
    const avgSpeed = live.length
      ? Math.round(live.reduce((s, b) => s + (MARKER_META[b.id]?.speed ?? 0), 0) / live.length)
      : 0
    return { running, idle, offline, avgSpeed }
  }, [])

  const filteredBuses = useMemo(() => {
    return mockBuses.filter((b) => {
      const matchesFilter = filter === 'all' || b.status === filter
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        b.bus_number.toLowerCase().includes(q) ||
        (b.driver_name ?? '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [search, filter])

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
        {/* LEFT — stylistic map panel */}
        <div
          className="relative min-h-[420px] overflow-hidden rounded-2xl border border-[var(--border)] lg:min-h-[560px]"
          style={{
            background:
              'radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 55%), radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 50%), linear-gradient(135deg, var(--muted), var(--background))',
          }}
        >
          {/* grid + route polylines */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            {/* route polyline 1 (green-ish, running) */}
            <path
              d="M 6% 80% Q 22% 50% 40% 55% T 70% 28%"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeDasharray="9 7"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* route polyline 2 */}
            <path
              d="M 90% 18% Q 70% 40% 55% 50% T 30% 88%"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeDasharray="6 8"
              strokeLinecap="round"
              opacity="0.45"
            />
          </svg>

          {/* compass / corner ornament */}
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/80 text-[var(--muted-foreground)] backdrop-blur">
            <Navigation size={16} />
          </div>

          {/* bus markers */}
          {filteredBuses.map((bus) => (
            <BusMarker
              key={bus.id}
              bus={bus}
              selected={selectedBusId === bus.id}
              onSelect={() => setSelectedBusId(bus.id)}
            />
          ))}

          {/* floating legend */}
          <div className="absolute bottom-4 left-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/90 p-3 text-xs shadow-lg backdrop-blur">
            <p className="mb-2 font-semibold text-[var(--foreground)]">Fleet Status</p>
            <div className="space-y-1.5">
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> On Route
              </span>
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Idle
              </span>
              <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Offline
              </span>
            </div>
          </div>
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
                const meta = MARKER_META[bus.id] ?? FALLBACK_META
                const status = bus.status ?? 'offline'
                const isSelected = selectedBusId === bus.id
                return (
                  <motion.button
                    key={bus.id}
                    layout
                    onClick={() => setSelectedBusId(bus.id)}
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
                        <span className="font-medium text-[var(--foreground)] tabular-nums">{meta.speed}</span> km/h
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-[var(--primary)]" />
                        ETA <span className="font-medium text-[var(--foreground)]">{meta.eta}</span>
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
