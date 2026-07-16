import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Route as RouteIcon, Plus, Bus, MapPin, Clock, Users, Map as MapIcon,
  Pencil, ArrowRight, CircleDot, Navigation, X, Download, Upload, QrCode,
  LayoutGrid, List, UserPlus, PlusCircle, ChevronDown, ChevronUp, Trash2,
  Eye, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { allStudents } from '@/lib/mockData'
import { downloadCSV, cn } from '@/lib/utils'
import { getRouteTripDurationDisplay } from '@/lib/tripDuration'
import { listRoutes, createRoute, updateRoute, type RouteInput } from '@/lib/api/routes'
import { listTrips } from '@/lib/api/trips'
import type { Route as RouteType, Student, Stop, Trip } from '@/types'

const SCHOOL_ID = 'sch_001'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the in_progress trip for a route, if any */
function getActiveTrip(routeId: string, trips: Trip[]) {
  return trips.find((t) => t.route_id === routeId && t.status === 'in_progress') ?? null
}

function routeTripDuration(routeId: string, trips: Trip[]) {
  return getRouteTripDurationDisplay(routeId, trips)
}

/** Auto-generate 2–3 intermediate stops from start/end words */
function generateStops(routeId: string, start: string, end: string): Stop[] {
  const startWords = start.trim().split(/\s+/)
  const endWords = end.trim().split(/\s+/)
  const names: string[] = []

  // Combine first word of start with last word of end
  if (startWords.length > 0 && endWords.length > 0) {
    names.push(`${startWords[0]} ${endWords[endWords.length - 1]} Junction`)
  }
  // Combine last word of start with first word of end
  if (startWords.length > 0 && endWords.length > 0) {
    names.push(`${startWords[startWords.length - 1]} ${endWords[0]} Crossing`)
  }
  // Add a midpoint name if start+end have enough words
  if (startWords.length + endWords.length >= 4) {
    names.push(`${startWords[Math.floor(startWords.length / 2)]} Midpoint`)
  }

  const times = ['7:10 AM', '7:20 AM', '7:30 AM']

  return names.slice(0, 3).map((name, i): Stop => ({
    id: `stop_${routeId}_auto_${i + 1}`,
    route_id: routeId,
    name,
    latitude: 25.1 + i * 0.01,
    longitude: 55.2 + i * 0.01,
    order_index: i + 1,
    estimated_time: times[i],
    student_count: 0,
  }))
}

// ─── QR download ──────────────────────────────────────────────────────────────
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

// ─── Stop Timeline with click-to-expand students ─────────────────────────────
interface StopTimelineProps {
  route: RouteType
  studentsOnRoute: Student[]
}

function StopTimeline({ route, studentsOnRoute }: StopTimelineProps) {
  const stops = route.stops ?? []
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null)

  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-4 text-center">
        <MapPin size={18} className="mx-auto text-[var(--muted-foreground)] mb-1.5" strokeWidth={1.5} />
        <p className="text-xs text-[var(--muted-foreground)]">No stops configured for this route yet.</p>
      </div>
    )
  }

  const ordered = [...stops].sort((a, b) => a.order_index - b.order_index)

  // For demo: assign students to stops by cycling through stop indices
  const studentsByStop: Record<string, Student[]> = {}
  studentsOnRoute.forEach((s, i) => {
    const stop = ordered[i % ordered.length]
    if (!stop) return
    if (!studentsByStop[stop.id]) studentsByStop[stop.id] = []
    studentsByStop[stop.id].push(s)
  })

  return (
    <div className="relative pl-1">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--primary)]/40 to-[var(--primary)]/10" />
      <ul className="space-y-4">
        {/* Start */}
        <li className="relative flex items-start gap-3">
          <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
            <Navigation size={11} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Start</p>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{route.start_point}</p>
          </div>
        </li>

        {ordered.map((stop) => {
          const studsAtStop = studentsByStop[stop.id] ?? []
          const isExpanded = expandedStopId === stop.id
          return (
            <li key={stop.id} className="relative">
              <div className="flex items-start gap-3">
                <span className="relative z-10 mt-0.5 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--card)]">
                  <CircleDot size={9} className="text-[var(--primary)]" />
                </span>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedStopId(isExpanded ? null : stop.id)}
                    className="min-w-0 text-left group"
                  >
                    <p className="truncate text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {stop.name}
                      {studsAtStop.length > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[var(--primary)]">
                          <Users size={11} />
                          <span className="text-[10px] font-bold">{studsAtStop.length}</span>
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </span>
                      )}
                    </p>
                    {stop.student_count !== undefined && studsAtStop.length === 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Users size={11} /> {stop.student_count} student{stop.student_count === 1 ? '' : 's'}
                      </p>
                    )}
                  </button>
                  {stop.estimated_time && (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] tabular-nums">
                      <Clock size={11} /> {stop.estimated_time}
                    </span>
                  )}
                </div>
              </div>
              {/* Inline student popover */}
              {isExpanded && studsAtStop.length > 0 && (
                <div className="ml-8 mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-md">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Students at this stop
                  </p>
                  <ul className="space-y-1">
                    {studsAtStop.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[10px] font-bold text-[var(--primary)]">
                          {s.name.charAt(0)}
                        </span>
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="flex-shrink-0 text-[var(--muted-foreground)]">{s.class}{s.division}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}

        {/* End */}
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
  allStudentsState: Student[]
  onAdd: (payload: RouteInput, assignedStudents: Student[]) => void
}

function AddRouteDialog({ allStudentsState, onAdd }: AddRouteDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startPoint, setStartPoint] = useState('')
  const [endPoint, setEndPoint] = useState('')

  function handleCreate() {
    if (!name.trim()) return
    const tempId = `route-${Date.now()}`
    const autoStops = generateStops(tempId, startPoint || 'Start', endPoint || 'End')

    const schoolStudents = allStudentsState.filter((s) => s.school_id === SCHOOL_ID)

    // Prefer truly unassigned; fall back to first 5 students from the school so the demo always shows assignments
    const unassigned = schoolStudents.filter((s) => !s.route_name)
    const toAssign = unassigned.length > 0 ? unassigned : schoolStudents.slice(0, 5)

    const payload: RouteInput = {
      name: name.trim(),
      start_point: startPoint.trim(),
      end_point: endPoint.trim(),
      type: 'pickup',
      is_active: true,
      stops: autoStops,
    }

    onAdd(payload, toAssign)
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
            Enter start and end points. Intermediate stops will be auto-generated and unassigned students will be auto-enrolled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="route-name">Route Name</Label>
            <Input
              id="route-name"
              placeholder="e.g. Route D - Pickup"
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
          <p className="text-xs text-[var(--muted-foreground)]">
            Stops will be auto-generated from the start and end point names.
          </p>
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
            <Input id="edit-route-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-route-start">Start Point</Label>
              <Input id="edit-route-start" value={startPoint} onChange={(e) => setStartPoint(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-route-end">End Point</Label>
              <Input id="edit-route-end" value={endPoint} onChange={(e) => setEndPoint(e.target.value)} />
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
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>Download</Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-csv">Upload filled CSV</Label>
            <Input id="bulk-csv" type="file" accept=".csv,text/csv" ref={fileRef} onChange={handleFile} className="cursor-pointer" />
          </div>
          {feedback && (
            <p className={`text-sm font-medium ${feedback.startsWith('Imported') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {feedback}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Student to Route Dialog ──────────────────────────────────────────────
interface AddStudentDialogProps {
  route: RouteType
  unassignedStudents: Student[]
  onAdd: (student: Student) => void
}

function AddStudentDialog({ route, unassignedStudents, onAdd }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = unassignedStudents.filter(
    (s) =>
      s.school_id === SCHOOL_ID &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll_number.includes(search)),
  )

  function handleAdd() {
    const s = unassignedStudents.find((x) => x.id === selected)
    if (!s) return
    onAdd(s)
    setSelected(null)
    setSearch('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={14} /> Add Student
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student to {route.name}</DialogTitle>
          <DialogDescription>Select an unassigned student to add to this route.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Search by name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-[var(--border)] p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No unassigned students found.</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    selected === s.id
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'hover:bg-[var(--muted)]'
                  }`}
                >
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected === s.id ? 'bg-white/20 text-white' : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  }`}>
                    {s.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className={`text-xs ${selected === s.id ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                      Class {s.class}{s.division} · #{s.roll_number}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleAdd} disabled={!selected}>Add to Route</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Stop Dialog ──────────────────────────────────────────────────────────
interface AddStopDialogProps {
  route: RouteType
  onAdd: (routeId: string, stop: Stop) => void
}

function AddStopDialog({ route, onAdd }: AddStopDialogProps) {
  const [open, setOpen] = useState(false)
  const [stopName, setStopName] = useState('')
  const [time, setTime] = useState('')

  function handleAdd() {
    if (!stopName.trim()) return
    const newOrder = (route.stops?.length ?? 0) + 1
    const stop: Stop = {
      id: `stop_${route.id}_manual_${Date.now()}`,
      route_id: route.id,
      name: stopName.trim(),
      latitude: 25.1,
      longitude: 55.2,
      order_index: newOrder,
      estimated_time: time.trim() || undefined,
      student_count: 0,
    }
    onAdd(route.id, stop)
    setStopName('')
    setTime('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusCircle size={14} /> Add Stop
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stop to {route.name}</DialogTitle>
          <DialogDescription>Enter a stop name and optional estimated arrival time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="stop-name">Stop Name</Label>
            <Input
              id="stop-name"
              placeholder="e.g. Al Wasl Road"
              value={stopName}
              onChange={(e) => setStopName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stop-time">Estimated Time (optional)</Label>
            <Input
              id="stop-time"
              placeholder="e.g. 7:25 AM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleAdd} disabled={!stopName.trim()}>Add Stop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Route Card (List View) ───────────────────────────────────────────────────
interface RouteCardProps {
  route: RouteType
  trips: Trip[]
  studentsOnRoute: Student[]
  unassignedStudents: Student[]
  onEdit: (route: RouteType) => void
  onViewMap: (route: RouteType) => void
  onDownloadQR: (route: RouteType) => void
  onAddStudent: (routeId: string, student: Student) => void
  onAddStop: (routeId: string, stop: Stop) => void
  onViewDetails: (route: RouteType) => void
}

function RouteCard({
  route, trips, studentsOnRoute, unassignedStudents,
  onEdit, onViewMap, onDownloadQR, onAddStudent, onAddStop, onViewDetails,
}: RouteCardProps) {
  const activeTrip = getActiveTrip(route.id, trips)
  const isRunning = !!activeTrip
  const tripDuration = routeTripDuration(route.id, trips)

  const pickupStudents = studentsOnRoute.filter(
    (s) => !s.route_name?.toLowerCase().includes('drop'),
  )
  const dropStudents = studentsOnRoute.filter(
    (s) => s.route_name?.toLowerCase().includes('drop'),
  )
  // For pickup-type routes show all students in pickup tab, drop tab empty (and vice versa)
  const tabPickup = route.type === 'pickup' ? studentsOnRoute : []
  const tabDrop = route.type === 'drop' ? studentsOnRoute : []

  return (
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
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={route.is_active ? 'active' : 'inactive'} size="sm" />
            {tripDuration && (
              <span className={cn(
                'text-[10px] font-bold tabular-nums whitespace-nowrap',
                tripDuration.isLong
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[var(--muted-foreground)]',
              )}>
                {tripDuration.isLive ? 'Live · ' : '✓ '}{tripDuration.label}
              </span>
            )}
            {isRunning && (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] font-semibold">
                In Progress
              </Badge>
            )}
          </div>
        </div>

        {/* Driver + Bus: only shown when route has an in-progress trip */}
        {isRunning && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2">
              <Bus size={15} className="flex-shrink-0 text-[var(--muted-foreground)]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Bus</p>
                <p className="truncate text-xs font-semibold text-[var(--foreground)]">{activeTrip.bus_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-3 py-2">
              <Users size={15} className="flex-shrink-0 text-[var(--muted-foreground)]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Driver</p>
                <p className="truncate text-xs font-semibold text-[var(--foreground)]">{activeTrip.driver_name}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-4">
        {/* Quick stats */}
        <div className="mb-4 flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <MapPin size={13} className="text-[var(--primary)]" />
            <span className="font-semibold text-[var(--foreground)]">{route.stops?.length ?? 0}</span> stops
          </span>
          <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <Users size={13} className="text-[var(--primary)]" />
            <span className="font-semibold text-[var(--foreground)]">{studentsOnRoute.length}</span> students
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

        {/* Tabs: Pickup / Drop students */}
        <Tabs defaultValue="pickup" className="mb-4">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="pickup" className="flex-1 text-xs">
              Pickup
              {tabPickup.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">{tabPickup.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drop" className="flex-1 text-xs">
              Drop
              {tabDrop.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">{tabDrop.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pickup" className="mt-2">
            {tabPickup.length === 0 ? (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-2">No pickup students</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tabPickup.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                    {s.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="drop" className="mt-2">
            {tabDrop.length === 0 ? (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-2">No drop students</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tabDrop.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    {s.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stop timeline */}
        <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <StopTimeline route={route} studentsOnRoute={studentsOnRoute} />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" className="flex-1" onClick={() => onViewDetails(route)}>
            <Eye size={14} /> View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(route)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onViewMap(route)}>
            <MapIcon size={14} /> Map
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onDownloadQR(route)}>
            <QrCode size={14} /> QR
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AddStudentDialog
            route={route}
            unassignedStudents={unassignedStudents}
            onAdd={(student) => onAddStudent(route.id, student)}
          />
          <AddStopDialog route={route} onAdd={onAddStop} />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mock names for Kanban boarding point cards ───────────────────────────────
const MOCK_STOP_NAMES = [
  ['Ahmed Hassan', 'Fatima Noor', 'Mohammed Khalid'],
  ['Aisha Rahman', 'Omar Abdullah', 'Sara Ali'],
  ['Yousef Mahmoud', 'Maryam Tariq', 'Ibrahim Yusuf'],
  ['Noor Hussain', 'Layla Hassan', 'Khalil Ahmad'],
]

// ─── Boarding Point Card (Kanban) ─────────────────────────────────────────────
interface BoardingPointCardProps {
  stop: Stop
  stopIndex: number
}

function BoardingPointCard({ stop, stopIndex }: BoardingPointCardProps) {
  const initialNames = MOCK_STOP_NAMES[stopIndex % MOCK_STOP_NAMES.length]
  const [students, setStudents] = useState<string[]>(initialNames)

  function removeStudent(name: string) {
    setStudents((prev) => prev.filter((n) => n !== name))
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      {/* Stop header */}
      <div className="flex items-center gap-2 mb-2">
        <CircleDot size={13} className="flex-shrink-0 text-[var(--primary)]" />
        <p className="truncate text-xs font-semibold text-[var(--foreground)]">{stop.name}</p>
        {stop.estimated_time && (
          <span className="ml-auto flex-shrink-0 flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)]">
            <Clock size={10} /> {stop.estimated_time}
          </span>
        )}
      </div>
      {/* Student list */}
      {students.length === 0 ? (
        <p className="text-[10px] text-[var(--muted-foreground)] pl-1">No students at this stop</p>
      ) : (
        <ul className="space-y-1">
          {students.map((name) => (
            <li key={name} className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[9px] font-bold text-[var(--primary)]">
                {name.charAt(0)}
              </span>
              <span className="flex-1 truncate text-[11px] text-[var(--foreground)]">{name}</span>
              <button
                type="button"
                onClick={() => removeStudent(name)}
                title="Remove student from stop"
                className="flex-shrink-0 rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Kanban Board View ────────────────────────────────────────────────────────
interface KanbanBoardProps {
  routes: RouteType[]
  trips: Trip[]
  students: Student[]
  onMoveStudent: (studentId: string, toRouteName: string) => void
  onBack: () => void
}

function KanbanBoard({ routes, trips, students, onMoveStudent, onBack }: KanbanBoardProps) {
  const [dragStudentId, setDragStudentId] = useState<string | null>(null)
  const [dragOverRouteId, setDragOverRouteId] = useState<string | null>(null)

  // ── Filter state ──────────────────────────────────────────────────────────
  const allStopNames = useMemo(() => {
    const names = new Set<string>()
    routes.forEach((r) => (r.stops ?? []).forEach((s) => names.add(s.name)))
    return Array.from(names).sort()
  }, [routes])

  const [filterFrom, setFilterFrom] = useState<string>('all')
  const [filterTo, setFilterTo] = useState<string>('all')

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const stops = r.stops ?? []
      const fromOk =
        filterFrom === 'all' || stops.some((s) => s.name === filterFrom)
      const toOk =
        filterTo === 'all' || stops.some((s) => s.name === filterTo)
      return fromOk && toOk
    })
  }, [routes, filterFrom, filterTo])

  function handleDragStart(e: React.DragEvent, studentId: string) {
    setDragStudentId(studentId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, routeId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverRouteId(routeId)
  }

  function handleDragLeave() {
    setDragOverRouteId(null)
  }

  function handleDrop(e: React.DragEvent, route: RouteType) {
    e.preventDefault()
    if (dragStudentId) {
      onMoveStudent(dragStudentId, route.name)
    }
    setDragStudentId(null)
    setDragOverRouteId(null)
  }

  function handleDragEnd() {
    setDragStudentId(null)
    setDragOverRouteId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: back button + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <List size={15} /> List View
        </Button>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] font-medium whitespace-nowrap">From stop:</span>
            <Select value={filterFrom} onValueChange={setFilterFrom}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All stops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stops</SelectItem>
                {allStopNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] font-medium whitespace-nowrap">To stop:</span>
            <Select value={filterTo} onValueChange={setFilterTo}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All stops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stops</SelectItem>
                {allStopNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filterFrom !== 'all' || filterTo !== 'all') && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setFilterFrom('all'); setFilterTo('all') }}>
              <X size={13} /> Clear
            </Button>
          )}
        </div>

        <p className="text-sm text-[var(--muted-foreground)] w-full sm:w-auto">
          Drag students between columns to reassign routes.
        </p>
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {/* Unassigned column */}
        {(() => {
          const unassigned = students.filter((s) => s.school_id === SCHOOL_ID && !s.route_name)
          const isDragOver = dragOverRouteId === '__unassigned__'
          return (
            <div
              key="__unassigned__"
              className={`flex w-72 flex-shrink-0 flex-col rounded-2xl border-2 transition-colors ${
                isDragOver
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] bg-[var(--muted)]/20'
              }`}
              onDragOver={(e) => handleDragOver(e, '__unassigned__')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault()
                if (dragStudentId) onMoveStudent(dragStudentId, '')
                setDragStudentId(null)
                setDragOverRouteId(null)
              }}
            >
              {/* Column header */}
              <div className="rounded-t-2xl border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
                      <Users size={16} className="text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">Unassigned</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{unassigned.length}</Badge>
                </div>
              </div>
              {/* Students */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                {unassigned.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">No unassigned students</p>
                ) : (
                  unassigned.map((s) => (
                    <KanbanStudentCard
                      key={s.id}
                      student={s}
                      isDragging={dragStudentId === s.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })()}

        {filteredRoutes.map((route) => {
          const activeTrip = getActiveTrip(route.id, trips)
          const isRunning = !!activeTrip
          const tripDuration = routeTripDuration(route.id, trips)
          const isDragOver = dragOverRouteId === route.id
          const routeStudents = students.filter(
            (s) => s.school_id === SCHOOL_ID && s.route_name === route.name,
          )
          const pickupStudents = routeStudents
          const dropStudents: Student[] = []
          const orderedStops = [...(route.stops ?? [])].sort((a, b) => a.order_index - b.order_index)

          return (
            <div
              key={route.id}
              className={`flex w-80 flex-shrink-0 flex-col rounded-2xl border-2 transition-colors ${
                isDragOver
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] bg-[var(--muted)]/20'
              }`}
              onDragOver={(e) => handleDragOver(e, route.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, route)}
            >
              {/* Column header */}
              <div className="rounded-t-2xl border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      isRunning ? 'bg-green-500/15' : 'bg-[var(--primary)]/10'
                    }`}>
                      <RouteIcon size={16} className={isRunning ? 'text-green-600 dark:text-green-400' : 'text-[var(--primary)]'} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">{route.name}</p>
                      {isRunning ? (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                          {activeTrip.driver_name} · {activeTrip.bus_number}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {route.start_point} → {route.end_point}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">{routeStudents.length}</Badge>
                    {tripDuration && (
                      <span className={cn(
                        'text-[9px] font-bold tabular-nums whitespace-nowrap',
                        tripDuration.isLong
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-[var(--muted-foreground)]',
                      )}>
                        {tripDuration.isLive ? 'Live ' : '✓ '}{tripDuration.label}
                      </span>
                    )}
                    {isRunning && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Live</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Boarding point cards */}
              {orderedStops.length > 0 && (
                <div className="px-3 pt-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] px-0.5">
                    Boarding Points
                  </p>
                  {orderedStops.map((stop, idx) => (
                    <BoardingPointCard key={stop.id} stop={stop} stopIndex={idx} />
                  ))}
                </div>
              )}

              {/* Pickup/Drop tabs within column */}
              <div className="px-3 pt-3">
                <Tabs defaultValue="pickup">
                  <TabsList className="h-7 w-full">
                    <TabsTrigger value="pickup" className="flex-1 text-[11px] h-6">Pickup</TabsTrigger>
                    <TabsTrigger value="drop" className="flex-1 text-[11px] h-6">Drop</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pickup" className="mt-2 space-y-2">
                    {pickupStudents.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">
                        {isDragOver ? 'Drop here' : 'No students'}
                      </p>
                    ) : (
                      pickupStudents.map((s) => (
                        <KanbanStudentCard
                          key={s.id}
                          student={s}
                          isDragging={dragStudentId === s.id}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="drop" className="mt-2 space-y-2">
                    {dropStudents.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">No drop students</p>
                    ) : (
                      dropStudents.map((s) => (
                        <KanbanStudentCard
                          key={s.id}
                          student={s}
                          isDragging={dragStudentId === s.id}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Drop zone indicator at the bottom when dragging */}
              {isDragOver && (
                <div className="mx-3 mb-3 mt-2 rounded-lg border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/5 p-3 text-center text-xs font-medium text-[var(--primary)]">
                  Release to move here
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Kanban Student Card ──────────────────────────────────────────────────────
interface KanbanStudentCardProps {
  student: Student
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
}

function KanbanStudentCard({ student, isDragging, onDragStart, onDragEnd }: KanbanStudentCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, student.id)}
      onDragEnd={onDragEnd}
      className={`flex cursor-grab items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm transition-all active:cursor-grabbing select-none ${
        isDragging ? 'opacity-40 scale-95 shadow-none' : 'hover:shadow-md hover:border-[var(--primary)]/30'
      }`}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
        {student.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[var(--foreground)]">{student.name}</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">
          Class {student.class}{student.division} · #{student.roll_number}
        </p>
      </div>
      {!student.is_active && (
        <span className="flex-shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400 uppercase">
          Inactive
        </span>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Routes() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const routesQuery = useQuery({
    queryKey: ['routes'],
    queryFn: () => listRoutes(),
  })
  const routes = useMemo(() => routesQuery.data?.routes ?? [], [routesQuery.data])

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: () => listTrips(),
  })
  const trips = useMemo(() => tripsQuery.data?.trips ?? [], [tripsQuery.data])

  // Student rosters/assignments have no backend endpoint in scope for this migration yet,
  // so they continue to be driven by local demo state.
  const [students, setStudents] = useState<Student[]>(allStudents)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [mapRoute, setMapRoute] = useState<RouteType | null>(null)
  const [editRoute, setEditRoute] = useState<RouteType | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const createRouteMutation = useMutation({
    mutationFn: (payload: RouteInput) => createRoute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    },
  })

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RouteInput> }) => updateRoute(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    },
  })

  const stats = useMemo(() => {
    const total = routes.length
    const active = routes.filter((r) => !!getActiveTrip(r.id, trips)).length
    const totalStops = routes.reduce((sum, r) => sum + (r.stops?.length ?? 0), 0)
    const totalStudents = routes.reduce((sum, r) => {
      return sum + students.filter((s) => s.school_id === SCHOOL_ID && s.route_name === r.name).length
    }, 0)
    return { total, active, totalStops, totalStudents }
  }, [routes, trips, students])

  const unassignedStudents = useMemo(
    () => students.filter((s) => s.school_id === SCHOOL_ID && !s.route_name),
    [students],
  )

  function handleAddRoute(payload: RouteInput, assignedStudents: Student[]) {
    createRouteMutation.mutate(payload, {
      onSuccess: (createdRoute) => {
        if (assignedStudents.length > 0) {
          setStudents((prev) =>
            prev.map((s) =>
              assignedStudents.find((a) => a.id === s.id)
                ? { ...s, route_name: createdRoute.name }
                : s,
            ),
          )
        }
      },
    })
  }

  function handleBulkImport(partials: Partial<RouteType>[]) {
    partials.forEach((p, i) => {
      const tempId = `route-bulk-${Date.now()}-${i}`
      const payload: RouteInput = {
        name: p.name ?? 'Unnamed Route',
        type: 'pickup',
        start_point: p.start_point ?? '',
        end_point: p.end_point ?? '',
        is_active: true,
        stops: generateStops(tempId, p.start_point ?? 'Start', p.end_point ?? 'End'),
      }
      createRouteMutation.mutate(payload)
    })
  }

  function handleSaveEdit(updated: RouteType) {
    updateRouteMutation.mutate({
      id: updated.id,
      payload: {
        name: updated.name,
        start_point: updated.start_point,
        end_point: updated.end_point,
      },
    })
  }

  function openEdit(route: RouteType) {
    setEditRoute(route)
    setEditOpen(true)
  }

  function handleAddStudent(routeId: string, student: Student) {
    const route = routes.find((r) => r.id === routeId)
    if (!route) return
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, route_name: route.name } : s)),
    )
  }

  function handleAddStop(routeId: string, stop: Stop) {
    const target = routes.find((r) => r.id === routeId)
    if (!target) return
    updateRouteMutation.mutate({
      id: routeId,
      payload: { stops: [...(target.stops ?? []), stop] },
    })
  }

  function handleMoveStudent(studentId: string, toRouteName: string) {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, route_name: toRouteName || undefined }
          : s,
      ),
    )
  }

  return (
    <Layout>
      <PageHeader
        title="Routes"
        subtitle="Manage bus routes and stops"
        actions={
          <div className="flex items-center gap-2">
            {view === 'list' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setView('kanban')}
                >
                  <LayoutGrid size={16} /> Kanban View
                </Button>
                <BulkImportDialog onImport={handleBulkImport} />
                <AddRouteDialog
                  allStudentsState={students}
                  onAdd={handleAddRoute}
                />
              </>
            ) : (
              <Button variant="outline" onClick={() => setView('list')}>
                <List size={16} /> List View
              </Button>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatsCard title="Total Routes" value={stats.total} icon={RouteIcon} color="primary" />
        <StatsCard title="Active Now" value={stats.active} icon={Navigation} color="success" subtitle={`${stats.total - stats.active} inactive`} />
        <StatsCard title="Total Stops" value={stats.totalStops} icon={MapPin} color="info" />
        <StatsCard title="Assigned Students" value={stats.totalStudents} icon={Users} color="warning" subtitle={`${unassignedStudents.length} unassigned`} />
      </div>

      {/* Main content */}
      {view === 'kanban' ? (
        <KanbanBoard
          routes={routes}
          students={students}
          onMoveStudent={handleMoveStudent}
          onBack={() => setView('list')}
        />
      ) : routes.length === 0 ? (
        <Card>
          <EmptyState
            icon={RouteIcon}
            title="No routes yet"
            description="Create your first route to start assigning buses, drivers and stops."
            action={
              <AddRouteDialog
                allStudentsState={students}
                onAdd={handleAddRoute}
              />
            }
          />
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {routes.map((route) => {
            const studentsOnRoute = students.filter(
              (s) => s.school_id === SCHOOL_ID && s.route_name === route.name,
            )
            return (
              <motion.div key={route.id} variants={item}>
                <RouteCard
                  route={route}
                  studentsOnRoute={studentsOnRoute}
                  unassignedStudents={unassignedStudents}
                  onEdit={openEdit}
                  onViewMap={setMapRoute}
                  onDownloadQR={downloadRouteQR}
                  onAddStudent={handleAddStudent}
                  onAddStop={handleAddStop}
                  onViewDetails={(r) => navigate(`/school-admin/routes/${r.id}`)}
                />
              </motion.div>
            )
          })}
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
    </Layout>
  )
}
