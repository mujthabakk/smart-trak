import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Bus as BusIcon, Navigation, MapPin, MoreVertical,
  Eye, Pencil, UserPlus, Ban, LayoutGrid, List, User, Clock, Users,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { allBuses, allRoutes } from '@/lib/mockData'
import type { Bus } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const card = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

// Deterministic occupancy so the UI is stable across renders.
function occupancyFor(bus: Bus): number {
  if (bus.status === 'offline' || !bus.status) return 0
  const seed = bus.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return Math.min(bus.seat_capacity, 18 + (seed % Math.max(1, bus.seat_capacity - 18)))
}

function routeForBus(busId: string): string | undefined {
  return allRoutes.find((r) => r.bus_id === busId)?.name
}

export default function Buses() {
  const navigate = useNavigate()
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const stats = useMemo(() => {
    const total = allBuses.length
    const running = allBuses.filter((b) => b.status === 'running').length
    const idle = allBuses.filter((b) => b.status === 'idle').length
    const offline = allBuses.filter((b) => !b.status || b.status === 'offline').length
    return { total, running, idle, offline }
  }, [])

  const columns: Column<Bus>[] = [
    {
      key: 'bus_number',
      header: 'Bus',
      sortable: true,
      accessor: (b) => b.bus_number,
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <BusIcon size={16} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">{b.bus_number}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{b.make_model ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'driver_name',
      header: 'Driver',
      render: (b) => (
        <span className="text-sm text-[var(--foreground)]">{b.driver_name ?? <span className="text-[var(--muted-foreground)]">Unassigned</span>}</span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (b) => {
        const route = routeForBus(b.id)
        return route ? (
          <span className="text-sm text-[var(--foreground)]">{route}</span>
        ) : (
          <span className="text-sm text-[var(--muted-foreground)]">—</span>
        )
      },
    },
    {
      key: 'capacity',
      header: 'Occupancy',
      render: (b) => {
        const occ = occupancyFor(b)
        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--muted-foreground)] tabular-nums">{occ}/{b.seat_capacity}</span>
            </div>
            <Progress value={(occ / b.seat_capacity) * 100} className="h-1.5" />
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status ?? 'offline'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (b) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/school-admin/live-map')}>
                <Navigation size={14} /> Track
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/school-admin/buses/${b.id}/edit`)}>
                <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus size={14} /> Assign Driver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Ban size={14} /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const viewToggle = (
    <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--card)]">
      <button
        onClick={() => setView('grid')}
        className={cn(
          'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
          view === 'grid' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
        )}
        aria-label="Grid view"
      >
        <LayoutGrid size={15} />
      </button>
      <button
        onClick={() => setView('table')}
        className={cn(
          'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
          view === 'table' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
        )}
        aria-label="Table view"
      >
        <List size={15} />
      </button>
    </div>
  )

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show">
        <PageHeader
          title="Buses"
          subtitle="Fleet registry, live status and assignments"
          actions={
            <>
              {viewToggle}
              <Button onClick={() => navigate('/school-admin/buses/add')}>
                <Plus size={16} /> Add Bus
              </Button>
            </>
          }
        />

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Buses" value={stats.total} icon={BusIcon} color="primary" />
          <StatsCard title="Running" value={stats.running} icon={Navigation} color="info" />
          <StatsCard title="Idle" value={stats.idle} icon={Clock} color="warning" />
          <StatsCard title="Offline" value={stats.offline} icon={Ban} color="danger" />
        </motion.div>

        {/* Grid or Table */}
        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {allBuses.map((bus) => {
              const occ = occupancyFor(bus)
              const route = routeForBus(bus.id)
              const status = bus.status ?? 'offline'
              return (
                <motion.div
                  key={bus.id}
                  variants={card}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Gradient header */}
                  <div className="relative bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_70%,black)] p-5 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                          <BusIcon size={22} className="text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold leading-tight">{bus.bus_number}</p>
                          <p className="text-xs text-white/80">{bus.make_model ?? 'Vehicle'}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                            <MoreVertical size={16} className="text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('/school-admin/live-map')}>
                            <Navigation size={14} /> Track
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/school-admin/buses/${bus.id}/edit`)}>
                            <Pencil size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus size={14} /> Assign Driver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive>
                            <Ban size={14} /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3">
                      <StatusBadge status={status} className="bg-white/20 text-white" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User size={15} className="text-[var(--muted-foreground)] flex-shrink-0" />
                      <span className="text-[var(--foreground)] truncate">{bus.driver_name ?? 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={15} className="text-[var(--muted-foreground)] flex-shrink-0" />
                      <span className="text-[var(--muted-foreground)] truncate">
                        {bus.current_stop ?? route ?? 'No active route'}
                      </span>
                    </div>

                    {/* Occupancy */}
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                          <Users size={13} /> Occupancy
                        </span>
                        <span className="font-medium text-[var(--foreground)] tabular-nums">
                          {occ}/{bus.seat_capacity}
                        </span>
                      </div>
                      <Progress value={(occ / bus.seat_capacity) * 100} />
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-[var(--border)]">
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {route ?? 'Unassigned route'}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => navigate('/school-admin/live-map')}>
                        <Navigation size={13} /> Track
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div variants={item}>
            <DataTable
              columns={columns}
              data={allBuses}
              keyField="id"
              searchable
              searchKeys={['bus_number', 'make_model', 'driver_name']}
              searchPlaceholder="Search buses…"
              emptyTitle="No buses found"
              emptyDescription="Add a bus to start building your fleet."
            />
          </motion.div>
        )}
      </motion.div>
    </Layout>
  )
}
