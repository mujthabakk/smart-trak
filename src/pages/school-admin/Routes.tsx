import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Route as RouteIcon, Plus, Bus, MapPin, Clock, Users, Map as MapIcon,
  Pencil, ArrowRight, CircleDot, Navigation, X, Download, Upload, QrCode,
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
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { allRoutes, allStudents } from '@/lib/mockData'
import { downloadCSV } from '@/lib/utils'
import type { Route as RouteType, Student } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── QR download (canvas-based, no external lib) ─────────────────────────────
function downloadRouteQR(route: RouteType) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 200, 200)
  ctx.fillStyle = '#000000'
  const data = route.name + route.id
  for (let i = 0; i < 20; i++)
    for (let j = 0; j < 20; j++)
      if ((data.charCodeAt((i * 20 + j) % data.length) + i + j) % 2 === 0)
        ctx.fillRect(i * 10, j * 10, 10, 10)
  // finder corners
  const fc = (x: number, y: number) => {
    ctx.fillRect(x, y, 70, 10)
    ctx.fillRect(x, y, 10, 70)
    ctx.fillRect(x + 60, y, 10, 70)
    ctx.fillRect(x, y + 60, 70, 10)
  }
  fc(0, 0); fc(130, 0); fc(0, 130)
  const link = document.createElement('a')
  link.download = `route-qr-${route.name.replace(/\s+/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// ─── Stop Timeline ────────────────────────────────────────────────────────────
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
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--primary)]/40 to-[var(--primary)]/10" />
      <ul className="space-y-4">
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

// ─── Add Route Dialog ─────────────────────────────────────────────────────────
interface AddRouteDialogProps {
  onAdd: (route: Partial<RouteType>) => void
}

function AddRouteDialog({ onAdd }: AddRouteDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startPoint, setStartPoint] = useState('')
  const [endPoint, setEndPoint] = useState('')

  function handleCreate() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), start_point: startPoint.trim(), end_point: endPoint.trim() })
    setName(''); setStartPoint(''); setEndPoint('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Add Route
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Route</DialogTitle>
          <DialogDescription>
            Create a route. You can add stops and assign a bus afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="route-name">Route Name</Label>
            <Input
              id="route-name"
              placeholder="e.g. Route C - Pickup"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="route-start">Start Point</Label>
              <Input
                id="route-start"
                placeholder="e.g. Al Barsha"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-end">End Point</Label>
              <Input
                id="route-end"
                placeholder="e.g. School"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate}>Create Route</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Route Dialog ────────────────────────────────────────────────────────
interface EditRouteDialogProps {
  route: RouteType
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (updated: RouteType) => void
}

function EditRouteDialog({ route, open, onOpenChange, onSave }: EditRouteDialogProps) {
  const [name, setName] = useState(route.name)
  const [startPoint, setStartPoint] = useState(route.start_point)
  const [endPoint, setEndPoint] = useState(route.end_point)

  // sync when route changes (dialog re-opens for a different route)
  const prevIdRef = useRef(route.id)
  if (prevIdRef.current !== route.id) {
    prevIdRef.current = route.id
    setName(route.name)
    setStartPoint(route.start_point)
    setEndPoint(route.end_point)
  }

  function handleSave() {
    onSave({ ...route, name: name.trim(), start_point: startPoint.trim(), end_point: endPoint.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Route</DialogTitle>
          <DialogDescription>Update the route name and endpoints.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-route-name">Route Name</Label>
            <Input
              id="edit-route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-route-start">Start Point</Label>
              <Input
                id="edit-route-start"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-route-end">End Point</Label>
              <Input
                id="edit-route-end"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bulk Import Dialog ───────────────────────────────────────────────────────
interface BulkImportDialogProps {
  onImport: (routes: Partial<RouteType>[]) => void
}

function BulkImportDialog({ onImport }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDownloadTemplate() {
    downloadCSV(
      [{ name: '', start_point: '', end_point: '' }] as unknown as Record<string, unknown>[],
      'routes_template',
    )
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length < 2) { setFeedback('CSV appears empty.'); return }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const nameIdx = headers.indexOf('name')
        const startIdx = headers.indexOf('start_point')
        const endIdx = headers.indexOf('end_point')
        if (nameIdx === -1) { setFeedback('Missing "name" column.'); return }
        const parsed: Partial<RouteType>[] = lines.slice(1).map((line) => {
          const cols = line.split(',').map((c) => c.trim())
          return {
            name: cols[nameIdx] ?? '',
            start_point: startIdx !== -1 ? (cols[startIdx] ?? '') : '',
            end_point: endIdx !== -1 ? (cols[endIdx] ?? '') : '',
          }
        }).filter((r) => r.name)
        if (parsed.length === 0) { setFeedback('No valid rows found.'); return }
        onImport(parsed)
        setFeedback(`Imported ${parsed.length} route${parsed.length === 1 ? '' : 's'}.`)
        if (fileRef.current) fileRef.current.value = ''
        setTimeout(() => { setOpen(false); setFeedback(null) }, 1200)
      } catch {
        setFeedback('Failed to parse CSV.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFeedback(null) }}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} /> Bulk Import
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Routes</DialogTitle>
          <DialogDescription>
            Download the CSV template, fill in your routes, then upload the file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <Download size={18} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">Download Template</p>
              <p className="text-xs text-[var(--muted-foreground)]">CSV with name, start_point, end_point columns</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
              Download
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-csv">Upload filled CSV</Label>
            <Input
              id="bulk-csv"
              type="file"
              accept=".csv,text/csv"
              ref={fileRef}
              onChange={handleFile}
              className="cursor-pointer"
            />
          </div>
          {feedback && (
            <p className={`text-sm font-medium ${feedback.startsWith('Imported') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {feedback}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Student Kanban Dialog ────────────────────────────────────────────────────
interface StudentKanbanDialogProps {
  route: RouteType
  open: boolean
  onOpenChange: (v: boolean) => void
}

function StudentKanbanDialog({ route, open, onOpenChange }: StudentKanbanDialogProps) {
  const initial = useMemo(
    () => allStudents.filter((s) => s.route_name === route.name),
    [route.name],
  )

  const [onRoute, setOnRoute] = useState<Student[]>([])
  const [removed, setRemoved] = useState<Student[]>([])

  // Reset when dialog opens or route changes
  const prevOpenRef = useRef(false)
  if (open && !prevOpenRef.current) {
    prevOpenRef.current = true
    setOnRoute([...initial])
    setRemoved([])
  }
  if (!open && prevOpenRef.current) {
    prevOpenRef.current = false
  }

  const dragSrc = useRef<{ id: string; col: 'on' | 'off' } | null>(null)
  const dragOver = useRef<{ id: string; col: 'on' | 'off' } | null>(null)

  function handleDragStart(id: string, col: 'on' | 'off') {
    dragSrc.current = { id, col }
  }

  function handleDragOver(e: React.DragEvent, id: string, col: 'on' | 'off') {
    e.preventDefault()
    dragOver.current = { id, col }
  }

  function handleDrop(e: React.DragEvent, targetCol: 'on' | 'off') {
    e.preventDefault()
    const src = dragSrc.current
    const over = dragOver.current
    if (!src) return

    const srcList = src.col === 'on' ? onRoute : removed
    const srcIdx = srcList.findIndex((s) => s.id === src.id)
    if (srcIdx === -1) return
    const student = srcList[srcIdx]

    // Moving to different column
    if (src.col !== targetCol) {
      const newSrc = srcList.filter((s) => s.id !== src.id)
      if (targetCol === 'on') {
        const tgt = over && over.col === 'on' ? onRoute.findIndex((s) => s.id === over.id) : -1
        const newOn = [...onRoute]
        tgt !== -1 ? newOn.splice(tgt, 0, student) : newOn.push(student)
        setOnRoute(newOn)
        setRemoved(newSrc)
      } else {
        const tgt = over && over.col === 'off' ? removed.findIndex((s) => s.id === over.id) : -1
        const newOff = [...removed]
        tgt !== -1 ? newOff.splice(tgt, 0, student) : newOff.push(student)
        setRemoved(newOff)
        setOnRoute(newSrc)
      }
    } else if (over && over.id !== src.id && over.col === src.col) {
      // Reorder within same column
      const list = [...srcList]
      list.splice(srcIdx, 1)
      const overIdx = list.findIndex((s) => s.id === over.id)
      list.splice(overIdx !== -1 ? overIdx : list.length, 0, student)
      src.col === 'on' ? setOnRoute(list) : setRemoved(list)
    }

    dragSrc.current = null
    dragOver.current = null
  }

  function handleColumnDrop(e: React.DragEvent, col: 'on' | 'off') {
    // Drop on empty column area
    handleDrop(e, col)
  }

  function StudentCard({ student, col }: { student: Student; col: 'on' | 'off' }) {
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(student.id, col)}
        onDragOver={(e) => handleDragOver(e, student.id, col)}
        onDrop={(e) => handleDrop(e, col)}
        className="group flex cursor-grab items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing select-none"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{student.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{student.class} {student.division}</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-[var(--primary)]" />
            Students on {route.name}
          </DialogTitle>
          <DialogDescription>
            Drag students between columns to manage route assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {/* On Route column */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                On Route
              </span>
              <Badge variant="secondary" className="text-xs">{onRoute.length}</Badge>
            </div>
            <div
              className="min-h-40 flex flex-col gap-2 rounded-xl border-2 border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5 p-2 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleColumnDrop(e, 'on')}
            >
              {onRoute.length === 0 ? (
                <p className="m-auto text-xs text-[var(--muted-foreground)] py-6 text-center">
                  Drop students here
                </p>
              ) : (
                onRoute.map((s) => <StudentCard key={s.id} student={s} col="on" />)
              )}
            </div>
          </div>
          {/* Removed column */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Removed
              </span>
              <Badge variant="secondary" className="text-xs">{removed.length}</Badge>
            </div>
            <div
              className="min-h-40 flex flex-col gap-2 rounded-xl border-2 border-dashed border-red-300/50 bg-red-50/50 dark:bg-red-950/10 p-2 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleColumnDrop(e, 'off')}
            >
              {removed.length === 0 ? (
                <p className="m-auto text-xs text-[var(--muted-foreground)] py-6 text-center">
                  Drop students here to remove
                </p>
              ) : (
                removed.map((s) => <StudentCard key={s.id} student={s} col="off" />)
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline"><X size={14} /> Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Routes() {
  const [routes, setRoutes] = useState<RouteType[]>(allRoutes)
  const [mapRoute, setMapRoute] = useState<RouteType | null>(null)
  const [editRoute, setEditRoute] = useState<RouteType | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [studentsRoute, setStudentsRoute] = useState<RouteType | null>(null)
  const [studentsOpen, setStudentsOpen] = useState(false)

  const stats = useMemo(() => {
    const total = routes.length
    const active = routes.filter((r) => r.is_active).length
    const totalStops = routes.reduce((sum, r) => sum + (r.stops?.length ?? 0), 0)
    return { total, active, totalStops }
  }, [routes])

  function handleAddRoute(partial: Partial<RouteType>) {
    const newRoute: RouteType = {
      id: `route-${Date.now()}`,
      school_id: routes[0]?.school_id ?? 'school-1',
      name: partial.name ?? 'Unnamed Route',
      start_point: partial.start_point ?? '',
      end_point: partial.end_point ?? '',
      type: 'pickup',
      is_active: true,
      stops: [],
      student_count: 0,
      created_at: new Date().toISOString(),
    } as unknown as RouteType
    setRoutes((prev) => [newRoute, ...prev])
  }

  function handleBulkImport(partials: Partial<RouteType>[]) {
    const newRoutes = partials.map((p, i): RouteType => ({
      id: `route-bulk-${Date.now()}-${i}`,
      school_id: routes[0]?.school_id ?? 'school-1',
      name: p.name ?? 'Unnamed Route',
      start_point: p.start_point ?? '',
      end_point: p.end_point ?? '',
      type: 'pickup',
      is_active: true,
      stops: [],
      student_count: 0,
      created_at: new Date().toISOString(),
    }) as unknown as RouteType)
    setRoutes((prev) => [...newRoutes, ...prev])
  }

  function handleSaveEdit(updated: RouteType) {
    setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  function openEdit(route: RouteType) {
    setEditRoute(route)
    setEditOpen(true)
  }

  function openStudents(route: RouteType) {
    setStudentsRoute(route)
    setStudentsOpen(true)
  }

  return (
    <Layout>
      <PageHeader
        title="Routes"
        subtitle="Manage bus routes and stops"
        actions={
          <div className="flex items-center gap-2">
            <BulkImportDialog onImport={handleBulkImport} />
            <AddRouteDialog onAdd={handleAddRoute} />
          </div>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard title="Total Routes" value={stats.total} icon={RouteIcon} color="primary" />
        <StatsCard title="Active Routes" value={stats.active} icon={Navigation} color="success" subtitle={`${stats.total - stats.active} inactive`} />
        <StatsCard title="Total Stops" value={stats.totalStops} icon={MapPin} color="info" />
        <StatsCard title="Avg Trip Time" value="42 min" icon={Clock} color="warning" subtitle="Across all routes" />
      </div>

      {routes.length === 0 ? (
        <Card>
          <EmptyState
            icon={RouteIcon}
            title="No routes yet"
            description="Create your first route to start assigning buses, drivers and stops."
            action={<AddRouteDialog onAdd={handleAddRoute} />}
          />
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {routes.map((route) => (
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
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(route)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMapRoute(route)}>
                      <MapIcon size={14} /> View on Map
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openStudents(route)}>
                      <Users size={14} /> Students
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadRouteQR(route)}>
                      <QrCode size={14} /> Download QR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* View on Map dialog */}
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

      {/* Edit Route dialog */}
      {editRoute && (
        <EditRouteDialog
          route={editRoute}
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setEditRoute(null) }}
          onSave={handleSaveEdit}
        />
      )}

      {/* Student Kanban dialog */}
      {studentsRoute && (
        <StudentKanbanDialog
          route={studentsRoute}
          open={studentsOpen}
          onOpenChange={(v) => { setStudentsOpen(v); if (!v) setStudentsRoute(null) }}
        />
      )}
    </Layout>
  )
}
