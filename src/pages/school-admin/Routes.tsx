import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Route as RouteIcon, Plus, Bus, MapPin, Clock, Users, Map as MapIcon,
  Pencil, ArrowRight, CircleDot, Navigation, X,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { mockRoutes } from '@/lib/mockData'
import type { Route as RouteType } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function StopTimeline({ route }: { route: RouteType }) {
  const stops = route.stops ?? []

  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-4 text-center">
        <MapPin size={18} className="mx-auto text-[var(--muted-foreground)] mb-1.5" strokeWidth={1.5} />
        <p className="text-xs text-[var(--muted-foreground)]">No stops configured for this route yet.</p>
      </div>
    )
  }

  const ordered = [...stops].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="relative pl-1">
      {/* vertical journey line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--primary)]/40 to-[var(--primary)]/10" />

      <ul className="space-y-4">
        {/* Start point */}
        <li className="relative flex items-start gap-3">
          <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
            <Navigation size={11} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Start</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{route.start_point}</p>
          </div>
        </li>

        {ordered.map((stop) => (
          <li key={stop.id} className="relative flex items-start gap-3">
            <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--card)]">
              <CircleDot size={9} className="text-[var(--primary)]" />
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{stop.name}</p>
                {stop.student_count !== undefined && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Users size={11} /> {stop.student_count} student{stop.student_count === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              {stop.estimated_time && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] tabular-nums">
                  <Clock size={11} /> {stop.estimated_time}
                </span>
              )}
            </div>
          </li>
        ))}

        {/* End point */}
        <li className="relative flex items-start gap-3">
          <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
            <MapPin size={11} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Destination</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{route.end_point}</p>
          </div>
        </li>
      </ul>
    </div>
  )
}

function AddRouteDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} /> Add Route
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Route</DialogTitle>
          <DialogDescription>
            Create a route and assign a bus and driver. You can add stops afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="route-name">Route Name</Label>
            <Input id="route-name" placeholder="e.g. Route C - Pickup" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="route-start">Start Point</Label>
              <Input id="route-start" placeholder="e.g. Al Barsha" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-end">End Point</Label>
              <Input id="route-end" placeholder="e.g. School" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Trip Type</Label>
              <Select defaultValue="pickup">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="drop">Drop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assign Bus</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="B-001">B-001</SelectItem>
                  <SelectItem value="B-002">B-002</SelectItem>
                  <SelectItem value="B-003">B-003</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => setOpen(false)}>Create Route</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Routes() {
  const [mapRoute, setMapRoute] = useState<RouteType | null>(null)

  const stats = useMemo(() => {
    const total = mockRoutes.length
    const active = mockRoutes.filter((r) => r.is_active).length
    const totalStops = mockRoutes.reduce((sum, r) => sum + (r.stops?.length ?? 0), 0)
    return { total, active, totalStops }
  }, [])

  return (
    <Layout>
      <PageHeader
        title="Routes"
        subtitle="Manage bus routes and stops"
        actions={<AddRouteDialog />}
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard title="Total Routes" value={stats.total} icon={RouteIcon} color="primary" />
        <StatsCard title="Active Routes" value={stats.active} icon={Navigation} color="success" subtitle={`${stats.total - stats.active} inactive`} />
        <StatsCard title="Total Stops" value={stats.totalStops} icon={MapPin} color="info" />
        <StatsCard title="Avg Trip Time" value="42 min" icon={Clock} color="warning" subtitle="Across all routes" />
      </div>

      {mockRoutes.length === 0 ? (
        <Card>
          <EmptyState
            icon={RouteIcon}
            title="No routes yet"
            description="Create your first route to start assigning buses, drivers and stops."
            action={<AddRouteDialog />}
          />
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {mockRoutes.map((route) => (
            <motion.div key={route.id} variants={item}>
              <Card className="flex h-full flex-col overflow-hidden">
                <CardHeader className="border-b border-[var(--border)] bg-[var(--muted)]/30 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                        <RouteIcon size={20} className="text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-[var(--foreground)]">{route.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Badge variant="muted" className="font-mono text-[10px]">{route.type}</Badge>
                          {route.route_qr_code && <span className="font-mono">{route.route_qr_code}</span>}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={route.is_active ? 'active' : 'inactive'} size="sm" />
                  </div>

                  {/* Meta row: bus + driver */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2">
                      <Bus size={15} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Bus</p>
                        <p className="truncate text-xs font-semibold text-[var(--foreground)]">{route.bus_number ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2">
                      <Users size={15} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Driver</p>
                        <p className="truncate text-xs font-semibold text-[var(--foreground)]">{route.driver_name ?? 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col pt-4">
                  {/* Quick stats strip */}
                  <div className="mb-4 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <MapPin size={13} className="text-[var(--primary)]" />
                      <span className="font-semibold text-[var(--foreground)]">{route.stops?.length ?? 0}</span> stops
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Users size={13} className="text-[var(--primary)]" />
                      <span className="font-semibold text-[var(--foreground)]">{route.student_count ?? 0}</span> students
                    </span>
                    {route.stops && route.stops.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                        <Clock size={13} className="text-[var(--primary)]" />
                        <span className="font-semibold text-[var(--foreground)] tabular-nums">{route.stops[0].estimated_time}</span>
                        <ArrowRight size={11} />
                        <span className="font-semibold text-[var(--foreground)] tabular-nums">{route.stops[route.stops.length - 1].estimated_time}</span>
                      </span>
                    )}
                  </div>

                  {/* Stop timeline */}
                  <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <StopTimeline route={route} />
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMapRoute(route)}>
                      <MapIcon size={14} /> View on Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* View on Map dialog (lightweight stylistic preview) */}
      <Dialog open={!!mapRoute} onOpenChange={(o) => !o && setMapRoute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapIcon size={18} className="text-[var(--primary)]" />
              {mapRoute?.name}
            </DialogTitle>
            <DialogDescription>
              {mapRoute?.start_point} → {mapRoute?.end_point} · {mapRoute?.stops?.length ?? 0} stops
            </DialogDescription>
          </DialogHeader>
          <div
            className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)]"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 60%), linear-gradient(135deg, var(--muted), var(--background))',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <pattern id="route-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#route-grid)" />
              <path
                d="M 40 200 Q 160 120 260 160 T 480 70"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeDasharray="8 6"
                strokeLinecap="round"
              />
            </svg>
            {(mapRoute?.stops ?? []).slice(0, 4).map((stop, i) => (
              <div
                key={stop.id}
                className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)] shadow-lg"
                style={{ left: `${15 + i * 22}%`, top: `${55 - i * 11}%` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline"><X size={14} /> Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
