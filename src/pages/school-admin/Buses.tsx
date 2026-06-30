import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Bus as BusIcon, Navigation, MapPin, MoreVertical,
  Pencil, Ban, LayoutGrid, List, User, Clock, Users, Download, Upload, QrCode, Phone,
  AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, downloadCSV } from '@/lib/utils'
import { allBuses, allRoutes, allTrips } from '@/lib/mockData'
import type { Bus } from '@/types'

const SCHOOL_ID = 'sch_001'

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

function routeTypeForBus(busId: string): 'pickup' | 'drop' | null {
  const route = allRoutes.find((r) => r.bus_id === busId)
  return route?.type ?? null
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns true if the bus has been running for > 1 hour based on its current trip
function isOverdueTrip(busId: string): boolean {
  const trip = allTrips.find((t) => t.bus_id === busId && t.status === 'in_progress')
  if (!trip?.started_at) return false
  const elapsed = (Date.now() - new Date(trip.started_at).getTime()) / (1000 * 60 * 60)
  // For demo: treat trips started > 1 day ago as overdue (since mock data uses past dates)
  return elapsed > 1
}

function downloadBusQR(bus: Bus) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 200, 200)
  // Simple grid pattern to simulate QR
  ctx.fillStyle = '#000000'
  const size = 10
  const data = bus.bus_number + bus.id
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      if ((data.charCodeAt((i * 20 + j) % data.length) + i + j) % 2 === 0) {
        ctx.fillRect(i * size, j * size, size, size)
      }
    }
  }
  // Add border squares (QR finder patterns)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 70, 10); ctx.fillRect(0, 0, 10, 70)
  ctx.fillRect(60, 0, 10, 70); ctx.fillRect(0, 60, 70, 10)
  // Save
  const link = document.createElement('a')
  link.download = `bus-qr-${bus.bus_number}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// --- Bus form types ---
interface BusFormData {
  bus_number: string
  make_model: string
  year: string
  seat_capacity: string
  insurance_expiry: string
  fitness_cert_expiry: string
}

const emptyForm: BusFormData = {
  bus_number: '',
  make_model: '',
  year: '',
  seat_capacity: '',
  insurance_expiry: '',
  fitness_cert_expiry: '',
}

function busToForm(bus: Bus): BusFormData {
  return {
    bus_number: bus.bus_number,
    make_model: bus.make_model ?? '',
    year: bus.year ? String(bus.year) : '',
    seat_capacity: String(bus.seat_capacity),
    insurance_expiry: bus.insurance_expiry ?? '',
    fitness_cert_expiry: bus.fitness_cert_expiry ?? '',
  }
}

// --- BusFormDialog ---
interface BusFormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: BusFormData
  title: string
  onSubmit: (data: BusFormData) => void
}

function BusFormDialog({ open, onOpenChange, initial, title, onSubmit }: BusFormDialogProps) {
  const [form, setForm] = useState<BusFormData>(initial ?? emptyForm)

  // Reset form when dialog opens with new initial values
  const prevOpen = useRef(false)
  if (open !== prevOpen.current) {
    prevOpen.current = open
    if (open) {
      setForm(initial ?? emptyForm)
    }
  }

  function set(field: keyof BusFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill in the details for this bus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="bus_number">Bus Number</Label>
            <Input
              id="bus_number"
              required
              placeholder="e.g. BUS-001"
              value={form.bus_number}
              onChange={(e) => set('bus_number', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="make_model">Make / Model</Label>
            <Input
              id="make_model"
              placeholder="e.g. Toyota Coaster"
              value={form.make_model}
              onChange={(e) => set('make_model', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min={1980}
              max={2099}
              placeholder="e.g. 2022"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seat_capacity">Seat Capacity</Label>
            <Input
              id="seat_capacity"
              type="number"
              min={1}
              required
              placeholder="e.g. 30"
              value={form.seat_capacity}
              onChange={(e) => set('seat_capacity', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
            <Input
              id="insurance_expiry"
              type="date"
              value={form.insurance_expiry}
              onChange={(e) => set('insurance_expiry', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fitness_cert_expiry">Fitness Cert Expiry</Label>
            <Input
              id="fitness_cert_expiry"
              type="date"
              value={form.fitness_cert_expiry}
              onChange={(e) => set('fitness_cert_expiry', e.target.value)}
            />
          </div>
          <DialogFooter className="col-span-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Bus</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- BulkImportDialog ---
interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImport: (buses: BusFormData[]) => void
}

function BulkImportDialog({ open, onOpenChange, onImport }: BulkImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<BusFormData[]>([])

  function handleTemplateDownload() {
    downloadCSV(
      [
        {
          bus_number: 'BUS-001',
          make_model: 'Toyota Coaster',
          year: 2022,
          seat_capacity: 30,
          insurance_expiry: '2026-12-31',
          fitness_cert_expiry: '2026-06-30',
        },
      ],
      'bus-import-template',
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setPreview([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')
        const headers = lines[0].split(',').map((h) => h.trim())
        const required = ['bus_number', 'make_model', 'year', 'seat_capacity', 'insurance_expiry', 'fitness_cert_expiry']
        for (const r of required) {
          if (!headers.includes(r)) throw new Error(`Missing column: ${r}`)
        }
        const parsed: BusFormData[] = lines.slice(1).map((line) => {
          const vals = line.split(',').map((v) => v.trim())
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
          return {
            bus_number: obj.bus_number,
            make_model: obj.make_model,
            year: obj.year,
            seat_capacity: obj.seat_capacity,
            insurance_expiry: obj.insurance_expiry,
            fitness_cert_expiry: obj.fitness_cert_expiry,
          }
        })
        setPreview(parsed)
      } catch (err) {
        setParseError((err as Error).message)
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    onImport(preview)
    setPreview([])
    setParseError(null)
    if (fileRef.current) fileRef.current.value = ''
    onOpenChange(false)
  }

  function handleClose(v: boolean) {
    if (!v) {
      setPreview([])
      setParseError(null)
      if (fileRef.current) fileRef.current.value = ''
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Buses</DialogTitle>
          <DialogDescription>
            Download the CSV template, fill it in, then upload it to import multiple buses at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <Button variant="outline" className="w-full" onClick={handleTemplateDownload}>
            <Download size={15} /> Download CSV Template
          </Button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv-upload">Upload Filled CSV</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              ref={fileRef}
              onChange={handleFileChange}
            />
          </div>

          {parseError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {parseError}
            </p>
          )}

          {preview.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3">
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                {preview.length} bus{preview.length > 1 ? 'es' : ''} ready to import
              </p>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                {preview.map((b, i) => (
                  <p key={i} className="text-xs text-[var(--muted-foreground)]">
                    {b.bus_number} — {b.make_model} ({b.year}) · {b.seat_capacity} seats
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button disabled={preview.length === 0} onClick={handleImport}>
            <Upload size={15} /> Import {preview.length > 0 ? `${preview.length} Buses` : 'Buses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type StatusFilter = 'all' | 'running' | 'idle' | 'offline'

const STATUS_FILTER_PILLS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Idle', value: 'idle' },
  { label: 'Offline', value: 'offline' },
]

// --- Main page ---
export default function Buses() {
  const navigate = useNavigate()
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()))

  // Local bus list (starts from mock data filtered for this school)
  const [buses, setBuses] = useState<Bus[]>(() =>
    allBuses.filter((b) => b.school_id === SCHOOL_ID),
  )

  // Dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [editBus, setEditBus] = useState<Bus | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const stats = useMemo(() => {
    const total = buses.length
    const running = buses.filter((b) => b.status === 'running').length
    const idle = buses.filter((b) => b.status === 'idle').length
    const offline = buses.filter((b) => !b.status || b.status === 'offline').length
    return { total, running, idle, offline }
  }, [buses])

  const filteredBuses = useMemo(() => {
    let result = buses
    if (statusFilter !== 'all') {
      result = result.filter((b) => {
        const st = b.status ?? 'offline'
        return st === statusFilter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.bus_number.toLowerCase().includes(q) ||
          (b.make_model ?? '').toLowerCase().includes(q) ||
          (b.driver_name ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [buses, statusFilter, search])

  function handleAdd(data: BusFormData) {
    const newBus: Bus = {
      id: `bus_local_${Date.now()}`,
      school_id: SCHOOL_ID,
      bus_number: data.bus_number,
      make_model: data.make_model || undefined,
      year: data.year ? Number(data.year) : undefined,
      seat_capacity: Number(data.seat_capacity) || 30,
      insurance_expiry: data.insurance_expiry || undefined,
      fitness_cert_expiry: data.fitness_cert_expiry || undefined,
      is_active: true,
      status: 'idle',
      created_at: new Date().toISOString(),
    }
    setBuses((prev) => [...prev, newBus])
  }

  function handleEdit(data: BusFormData) {
    if (!editBus) return
    setBuses((prev) =>
      prev.map((b) =>
        b.id === editBus.id
          ? {
              ...b,
              bus_number: data.bus_number,
              make_model: data.make_model || undefined,
              year: data.year ? Number(data.year) : undefined,
              seat_capacity: Number(data.seat_capacity) || b.seat_capacity,
              insurance_expiry: data.insurance_expiry || undefined,
              fitness_cert_expiry: data.fitness_cert_expiry || undefined,
            }
          : b,
      ),
    )
    setEditBus(null)
  }

  function handleBulkImport(items: BusFormData[]) {
    const newBuses: Bus[] = items.map((data, i) => ({
      id: `bus_bulk_${Date.now()}_${i}`,
      school_id: SCHOOL_ID,
      bus_number: data.bus_number,
      make_model: data.make_model || undefined,
      year: data.year ? Number(data.year) : undefined,
      seat_capacity: Number(data.seat_capacity) || 30,
      insurance_expiry: data.insurance_expiry || undefined,
      fitness_cert_expiry: data.fitness_cert_expiry || undefined,
      is_active: true,
      status: 'idle',
      created_at: new Date().toISOString(),
    }))
    setBuses((prev) => [...prev, ...newBuses])
  }

  // Shared dropdown actions renderer
  function BusActions({ bus }: { bus: Bus }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/school-admin/buses/${bus.id}`)}>
            <BusIcon size={14} /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/school-admin/live-map')}>
            <Navigation size={14} /> Track
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditBus(bus)}>
            <Pencil size={14} /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadBusQR(bus)}>
            <QrCode size={14} /> Download QR
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive>
            <Ban size={14} /> Deactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const columns: Column<Bus>[] = [
    {
      key: 'bus_number',
      header: 'Bus',
      sortable: true,
      accessor: (b) => b.bus_number,
      render: (b) => {
        const overdue = isOverdueTrip(b.id)
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
              overdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-[var(--primary)]/10',
            )}>
              <BusIcon size={16} className={overdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--primary)]'} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-[var(--foreground)]">{b.bus_number}</p>
                {overdue && <AlertCircle size={13} className="text-red-500" />}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{b.make_model ?? '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'driver_name',
      header: 'Driver',
      render: (b) => (
        <span className="text-sm text-[var(--foreground)]">
          {b.driver_name ?? <span className="text-[var(--muted-foreground)]">Unassigned</span>}
        </span>
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
      key: 'type',
      header: 'Type',
      render: (b) => {
        const type = routeTypeForBus(b.id)
        if (!type) return <span className="text-sm text-[var(--muted-foreground)]">—</span>
        return (
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            type === 'pickup'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          )}>
            {type === 'pickup' ? 'Pickup' : 'Drop'}
          </span>
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
      render: (b) => {
        const overdue = isOverdueTrip(b.id)
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status ?? 'offline'} />
            {overdue && (
              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full px-1.5 py-0.5">
                &gt;1hr
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (b) => (
        <div className="flex justify-end">
          <BusActions bus={b} />
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
          view === 'grid'
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
        )}
        aria-label="Grid view"
      >
        <LayoutGrid size={15} />
      </button>
      <button
        onClick={() => setView('table')}
        className={cn(
          'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
          view === 'table'
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
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
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <Upload size={16} /> Bulk Import
              </Button>
              <Button onClick={() => setAddOpen(true)}>
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

        {/* Horizontal Calendar */}
        <motion.div variants={item} className="mb-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <HorizontalCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter pills + Search */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTER_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => setStatusFilter(pill.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  statusFilter === pill.value
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
          {/* Search (grid view only — table view has its own search) */}
          {view === 'grid' && (
            <div className="sm:ml-auto">
              <Input
                placeholder="Search buses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
            </div>
          )}
        </motion.div>

        {/* Grid or Table */}
        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredBuses.map((bus) => {
              const occ = occupancyFor(bus)
              const route = routeForBus(bus.id)
              const routeType = routeTypeForBus(bus.id)
              const status = bus.status ?? 'offline'
              const overdue = isOverdueTrip(bus.id)
              return (
                <motion.div
                  key={bus.id}
                  variants={card}
                  whileHover={{ y: -3 }}
                  className={cn(
                    'rounded-2xl border shadow-sm overflow-hidden flex flex-col',
                    overdue
                      ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                      : 'border-[var(--border)] bg-[var(--card)]',
                  )}
                >
                  {/* Gradient header */}
                  <div className={cn(
                    'relative p-5 text-white',
                    overdue
                      ? 'bg-gradient-to-br from-red-600 to-red-800'
                      : 'bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_70%,black)]',
                  )}>
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
                          <DropdownMenuItem onClick={() => setEditBus(bus)}>
                            <Pencil size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadBusQR(bus)}>
                            <QrCode size={14} /> Download QR
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive>
                            <Ban size={14} /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <StatusBadge status={status} className="bg-white/20 text-white" />
                      {routeType && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {routeType === 'pickup' ? 'Pickup' : 'Drop'}
                        </span>
                      )}
                      {overdue && (
                        <span className="rounded-full bg-white/30 px-2 py-0.5 text-[11px] font-bold text-white flex items-center gap-1">
                          <AlertCircle size={10} /> &gt;1hr
                        </span>
                      )}
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

                    <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-[var(--border)]">
                      <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                        {route ?? 'Unassigned route'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                        >
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate('/school-admin/live-map')}>
                          <Navigation size={13} /> Track
                        </Button>
                      </div>
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
              data={filteredBuses}
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

      {/* Add Bus Dialog */}
      <BusFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Bus"
        onSubmit={handleAdd}
      />

      {/* Edit Bus Dialog */}
      <BusFormDialog
        open={editBus !== null}
        onOpenChange={(v) => { if (!v) setEditBus(null) }}
        title="Edit Bus"
        initial={editBus ? busToForm(editBus) : emptyForm}
        onSubmit={handleEdit}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onImport={handleBulkImport}
      />
    </Layout>
  )
}
