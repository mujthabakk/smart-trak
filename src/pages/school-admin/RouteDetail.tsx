import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { allRoutes, allStudents, allTrips, mockAttendance } from '@/lib/mockData'
import { getInitials, cn } from '@/lib/utils'
import { getRouteTripDurationDisplay } from '@/lib/tripDuration'
import type { Route, Stop, Student } from '@/types'
import {
  ArrowLeft, QrCode, MapPin, CircleDot, Clock, Users,
  Bus as BusIcon, User, ChevronDown, ChevronUp,
  Navigation, ArrowRight, Plus, Pencil, Trash2, UserPlus, GripVertical,
  ArrowRightLeft, Search, UserMinus, CalendarCheck,
} from 'lucide-react'

const SCHOOL_ID = 'sch_001'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const MORNING_START = '6:45 AM'
const MORNING_END = '8:30 AM'
const EVENING_START = '2:30 PM'
const EVENING_END = '4:00 PM'

function downloadRouteQR(routeName: string, routeId: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 200, 200)
  ctx.fillStyle = '#000000'
  const data = routeName + routeId
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
  link.download = `route-qr-${routeName.replace(/\s+/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function interpolateTimes(stops: Stop[], startTime: string, endTime: string): string[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [startTime]
  function toMinutes(t: string): number {
    const [timePart, period] = t.split(' ')
    const [h, m] = timePart.split(':').map(Number)
    const hours = period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h
    return hours * 60 + m
  }
  function fromMinutes(mins: number): string {
    const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
  }
  const startMins = toMinutes(startTime)
  const endMins = toMinutes(endTime)
  return stops.map((_, idx) => {
    const frac = stops.length === 1 ? 0 : idx / (stops.length - 1)
    return fromMinutes(Math.round(startMins + frac * (endMins - startMins)))
  })
}

function buildInitialStopMap(stops: Stop[], students: Student[]): Record<string, string> {
  const ordered = [...stops].sort((a, b) => a.order_index - b.order_index)
  const map: Record<string, string> = {}
  students.forEach((s, i) => {
    if (s.pickup_stop_id && ordered.some((st) => st.id === s.pickup_stop_id)) {
      map[s.id] = s.pickup_stop_id
    } else if (ordered.length > 0) {
      map[s.id] = ordered[i % ordered.length].id
    }
  })
  return map
}

function attendanceForStudents(students: Student[]): { present: number; total: number } {
  const total = students.length
  const present = students.filter(
    (s) => mockAttendance.find((a) => a.student_id === s.id)?.status === 'present',
  ).length
  return { present, total }
}

function studentAttendanceStatus(studentId: string): 'present' | 'absent' | 'pending' {
  const record = mockAttendance.find((a) => a.student_id === studentId)
  if (!record) return 'pending'
  if (record.status === 'present') return 'present'
  if (record.status === 'absent' || record.status === 'leave') return 'absent'
  return 'pending'
}

// ─── Draggable student row ────────────────────────────────────────────────────
interface DraggableStudentRowProps {
  student: Student
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onEdit: () => void
  onRemove: () => void
  onView: () => void
}

function DraggableStudentRow({
  student, isDragging, onDragStart, onDragEnd, onEdit, onRemove, onView,
}: DraggableStudentRowProps) {
  const att = studentAttendanceStatus(student.id)

  return (
    <li
      draggable
      onDragStart={(e) => onDragStart(e, student.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 transition-all select-none',
        isDragging ? 'opacity-40 scale-95' : 'hover:border-[var(--primary)]/40 hover:shadow-sm',
      )}
    >
      <GripVertical
        size={14}
        className="flex-shrink-0 cursor-grab text-[var(--muted-foreground)]"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onView}
        className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-[11px] font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
            {getInitials(student.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]">{student.name}</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">Class {student.class}{student.division} · #{student.roll_number}</p>
        </div>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0',
          att === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : att === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        )}>
          {att === 'present' ? 'Present' : att === 'absent' ? 'Absent' : 'Pending'}
        </span>
      </button>
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil size={13} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={onRemove}>
          <Trash2 size={13} />
        </Button>
      </div>
    </li>
  )
}

// ─── Stop card with student management ─────────────────────────────────────────
interface StopCardProps {
  stop: Stop
  orderNumber: number
  students: Student[]
  dragStudentId: string | null
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onEditStop: () => void
  onDeleteStop: () => void
  onAddStudent: () => void
  onEditStudent: (student: Student) => void
  onRemoveStudent: (studentId: string) => void
  onViewStudent: (studentId: string) => void
}

function StopCard({
  stop, orderNumber, students, dragStudentId, isDragOver,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onEditStop, onDeleteStop, onAddStudent, onEditStudent, onRemoveStudent, onViewStudent,
}: StopCardProps) {
  const [open, setOpen] = useState(true)
  const stopAttendance = attendanceForStudents(students)

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        isDragOver ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--card)]',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/20">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left min-w-0">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
            {orderNumber}
          </span>
          <CircleDot size={15} className="flex-shrink-0 text-[var(--primary)]" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{stop.name}</p>
            <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1 truncate">
              <MapPin size={11} className="flex-shrink-0" />
              Location: {stop.name}
              {stop.latitude != null && stop.longitude != null && (
                <span className="text-[10px] opacity-70">({stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)})</span>
              )}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {students.length} student{students.length !== 1 ? 's' : ''}
              {stop.estimated_time ? ` · ${stop.estimated_time}` : ''}
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px] tabular-nums flex-shrink-0">
            {stopAttendance.present}/{stopAttendance.total}
          </Badge>
          {open ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEditStop}>
          <Pencil size={14} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onDeleteStop}>
          <Trash2 size={14} />
        </Button>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          {students.length === 0 ? (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-4 border border-dashed border-[var(--border)] rounded-lg">
              {isDragOver ? 'Drop student here' : 'No students at this stop'}
            </p>
          ) : (
            <ul className="space-y-2">
              {students.map((s) => (
                <DraggableStudentRow
                  key={s.id}
                  student={s}
                  isDragging={dragStudentId === s.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onEdit={() => onEditStudent(s)}
                  onRemove={() => onRemoveStudent(s.id)}
                  onView={() => onViewStudent(s.id)}
                />
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddStudent}>
            <UserPlus size={14} /> Add Student
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Route transfer panel ─────────────────────────────────────────────────────
interface RouteTransferPanelProps {
  currentRoute: Route
  sameTypeRoutes: Route[]
  studentsOnCurrentRoute: Student[]
  allStudents: Student[]
  dragStudentId: string | null
  dragOverRouteId: string | null
  targetRouteId: string
  targetStopId: string
  compareRouteId: string
  transferSearch: string
  selectedStudentIds: string[]
  transferMode: 'quick' | 'drag'
  onTargetRouteChange: (id: string) => void
  onTargetStopChange: (id: string) => void
  onCompareRouteChange: (id: string) => void
  onTransferSearchChange: (q: string) => void
  onSelectedStudentsChange: (ids: string[]) => void
  onTransferModeChange: (mode: 'quick' | 'drag') => void
  onMoveStudents: (studentIds: string[], routeName: string, routeId: string, stopId?: string) => void
  onUnassignStudents: (studentIds: string[]) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, routeId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, routeName: string, routeId: string) => void
}

function RouteColumn({
  route, students, isCurrent, isDragOver, dragStudentId,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: {
  route: Route
  students: Student[]
  isCurrent: boolean
  isDragOver: boolean
  dragStudentId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <div
      className={cn(
        'flex flex-1 min-w-0 flex-col rounded-2xl border-2 transition-colors',
        isDragOver ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--muted)]/20',
        isCurrent && 'ring-2 ring-[var(--primary)]/30',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="rounded-t-2xl border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--foreground)]">{route.name}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{route.bus_number ?? 'No bus'} · {route.driver_name ?? 'No driver'}</p>
          </div>
          <Badge variant="secondary" className="text-xs">{students.length}</Badge>
        </div>
        {isCurrent && (
          <Badge className="mt-2 text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20">
            Current route
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3 min-h-[160px] max-h-80 overflow-y-auto">
        {students.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">
            {isDragOver ? 'Drop student here' : 'No students'}
          </p>
        ) : (
          students.map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => onDragStart(e, s.id)}
              onDragEnd={onDragEnd}
              className={cn(
                'flex cursor-grab items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 active:cursor-grabbing',
                dragStudentId === s.id && 'opacity-40',
              )}
            >
              <GripVertical size={12} className="text-[var(--muted-foreground)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--foreground)]">{s.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Class {s.class}{s.division}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function RouteTransferPanel({
  currentRoute, sameTypeRoutes, studentsOnCurrentRoute, allStudents,
  dragStudentId, dragOverRouteId, targetRouteId, targetStopId, compareRouteId,
  transferSearch, selectedStudentIds, transferMode,
  onTargetRouteChange, onTargetStopChange, onCompareRouteChange,
  onTransferSearchChange, onSelectedStudentsChange, onTransferModeChange,
  onMoveStudents, onUnassignStudents,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: RouteTransferPanelProps) {
  const targetRoute = sameTypeRoutes.find((r) => r.id === targetRouteId)
  const compareRoute = sameTypeRoutes.find((r) => r.id === compareRouteId)
  const targetStops = [...(targetRoute?.stops ?? [])].sort((a, b) => a.order_index - b.order_index)

  const filteredStudents = studentsOnCurrentRoute.filter(
    (s) =>
      s.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
      s.roll_number.includes(transferSearch),
  )

  const allSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.includes(s.id))

  function toggleStudent(id: string) {
    onSelectedStudentsChange(
      selectedStudentIds.includes(id)
        ? selectedStudentIds.filter((x) => x !== id)
        : [...selectedStudentIds, id],
    )
  }

  function toggleAll() {
    if (allSelected) {
      onSelectedStudentsChange(selectedStudentIds.filter((id) => !filteredStudents.some((s) => s.id === id)))
    } else {
      const ids = new Set([...selectedStudentIds, ...filteredStudents.map((s) => s.id)])
      onSelectedStudentsChange([...ids])
    }
  }

  function handleQuickMove() {
    if (!targetRoute || selectedStudentIds.length === 0) return
    onMoveStudents(
      selectedStudentIds,
      targetRoute.name,
      targetRoute.id,
      targetStopId && targetStopId !== '__auto__' ? targetStopId : undefined,
    )
    onSelectedStudentsChange([])
  }

  return (
    <div className="space-y-5">
      {/* Route selectors */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>From Route</Label>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--foreground)]">{currentRoute.name}</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">{studentsOnCurrentRoute.length} students</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>To Route</Label>
          <Select value={targetRouteId} onValueChange={onTargetRouteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination route" />
            </SelectTrigger>
            <SelectContent>
              {sameTypeRoutes
                .filter((r) => r.id !== currentRoute.id)
                .map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.bus_number ?? 'No bus'})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>To Stop (optional)</Label>
          <Select value={targetStopId} onValueChange={onTargetStopChange} disabled={!targetRoute}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-assign to nearest stop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">Auto-assign (first available stop)</SelectItem>
              {targetStops.map((stop) => (
                <SelectItem key={stop.id} value={stop.id}>
                  {stop.order_index}. {stop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={transferMode} onValueChange={(v) => onTransferModeChange(v as 'quick' | 'drag')}>
        <TabsList>
          <TabsTrigger value="quick">Quick Move</TabsTrigger>
          <TabsTrigger value="drag">Drag &amp; Drop</TabsTrigger>
        </TabsList>

        {/* Quick move */}
        <TabsContent value="quick" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className="pl-9"
                placeholder="Search students on this route..."
                value={transferSearch}
                onChange={(e) => onTransferSearchChange(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!targetRoute || selectedStudentIds.length === 0}
                onClick={handleQuickMove}
              >
                <ArrowRightLeft size={14} />
                Move {selectedStudentIds.length > 0 ? selectedStudentIds.length : ''} Student{selectedStudentIds.length !== 1 ? 's' : ''}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedStudentIds.length === 0}
                onClick={() => {
                  onUnassignStudents(selectedStudentIds)
                  onSelectedStudentsChange([])
                }}
              >
                <UserMinus size={14} /> Unassign
              </Button>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No students on this route.</p>
          ) : (
            <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 bg-[var(--card)] hover:bg-[var(--muted)]/30 transition-colors',
                    selectedStudentIds.includes(s.id) && 'bg-[var(--primary)]/5',
                  )}
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(s.id)}
                    onCheckedChange={() => toggleStudent(s.id)}
                  />
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                      {getInitials(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Class {s.class}{s.division} · #{s.roll_number}</p>
                  </div>
                  <Select
                    value=""
                    onValueChange={(routeId) => {
                      const dest = sameTypeRoutes.find((r) => r.id === routeId)
                      if (dest) onMoveStudents([s.id], dest.name, dest.id)
                    }}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Move to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sameTypeRoutes
                        .filter((r) => r.id !== currentRoute.id)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Drag & drop — two routes selected via dropdown */}
        <TabsContent value="drag" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label>Compare With Route</Label>
              <Select value={compareRouteId} onValueChange={onCompareRouteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route to compare" />
                </SelectTrigger>
                <SelectContent>
                  {sameTypeRoutes
                    .filter((r) => r.id !== currentRoute.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.bus_number ?? 'No bus'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] pb-2">
              Drag students between the two columns below.
            </p>
          </div>

          {compareRoute ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RouteColumn
                route={currentRoute}
                students={studentsOnCurrentRoute}
                isCurrent
                isDragOver={dragOverRouteId === currentRoute.id}
                dragStudentId={dragStudentId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOver(e, currentRoute.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, currentRoute.name, currentRoute.id)}
              />
              <RouteColumn
                route={compareRoute}
                students={allStudents.filter((s) => s.route_name === compareRoute.name)}
                isCurrent={false}
                isDragOver={dragOverRouteId === compareRoute.id}
                dragStudentId={dragStudentId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOver(e, compareRoute.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, compareRoute.name, compareRoute.id)}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">Select a route above to start drag &amp; drop.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RouteDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const baseRoute = allRoutes.find((r) => r.id === id)

  const [isActive, setIsActive] = useState(baseRoute?.is_active ?? false)
  const [stops, setStops] = useState<Stop[]>(() => [...(baseRoute?.stops ?? [])])
  const [schoolStudents, setSchoolStudents] = useState<Student[]>(() =>
    allStudents.filter((s) => s.school_id === SCHOOL_ID),
  )

  const routeStudents = useMemo(
    () => schoolStudents.filter((s) => s.route_name === baseRoute?.name),
    [schoolStudents, baseRoute?.name],
  )

  const [studentStopMap, setStudentStopMap] = useState<Record<string, string>>(() =>
    baseRoute ? buildInitialStopMap(baseRoute.stops ?? [], routeStudents) : {},
  )

  const [dragStudentId, setDragStudentId] = useState<string | null>(null)
  const [dragOverStopId, setDragOverStopId] = useState<string | null>(null)
  const [dragOverRouteId, setDragOverRouteId] = useState<string | null>(null)

  // Dialogs
  const [addStopOpen, setAddStopOpen] = useState(false)
  const [newStopName, setNewStopName] = useState('')
  const [newStopTime, setNewStopTime] = useState('')
  const [editStopTarget, setEditStopTarget] = useState<Stop | null>(null)
  const [editStopName, setEditStopName] = useState('')
  const [editStopTime, setEditStopTime] = useState('')
  const [addStudentStopId, setAddStudentStopId] = useState<string | null>(null)
  const [addStudentSearch, setAddStudentSearch] = useState('')
  const [editStudentTarget, setEditStudentTarget] = useState<Student | null>(null)
  const [editStudentClass, setEditStudentClass] = useState('')
  const [editStudentDivision, setEditStudentDivision] = useState('')

  const sameTypeRoutes = useMemo(
    () => allRoutes.filter((r) => r.school_id === SCHOOL_ID && r.type === (baseRoute?.type ?? 'pickup')),
    [baseRoute?.type],
  )
  const otherRoutes = useMemo(
    () => sameTypeRoutes.filter((r) => r.id !== id),
    [sameTypeRoutes, id],
  )

  const [targetRouteId, setTargetRouteId] = useState(() => otherRoutes[0]?.id ?? '')
  const [targetStopId, setTargetStopId] = useState('__auto__')
  const [compareRouteId, setCompareRouteId] = useState(() => otherRoutes[0]?.id ?? '')
  const [transferSearch, setTransferSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [transferMode, setTransferMode] = useState<'quick' | 'drag'>('quick')

  if (!baseRoute) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <MapPin size={40} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-[var(--foreground)]">Route not found</p>
          <Button variant="outline" onClick={() => navigate('/school-admin/routes')}>
            <ArrowLeft size={15} /> Back to Routes
          </Button>
        </div>
      </Layout>
    )
  }

  const route = { ...baseRoute, stops, is_active: isActive }
  const orderedStops = [...stops].sort((a, b) => a.order_index - b.order_index)

  const studentsByStop = useMemo(() => {
    const map: Record<string, Student[]> = {}
    orderedStops.forEach((s) => { map[s.id] = [] })
    routeStudents.forEach((s) => {
      const stopId = studentStopMap[s.id]
      if (stopId && map[stopId]) map[stopId].push(s)
      else if (orderedStops[0]) {
        if (!map[orderedStops[0].id]) map[orderedStops[0].id] = []
        map[orderedStops[0].id].push(s)
      }
    })
    return map
  }, [routeStudents, studentStopMap, orderedStops])

  const unassignedForRoute = schoolStudents.filter(
    (s) => !s.route_name || s.route_name !== route.name,
  )

  const filteredUnassigned = unassignedForRoute.filter(
    (s) =>
      s.name.toLowerCase().includes(addStudentSearch.toLowerCase()) ||
      s.roll_number.includes(addStudentSearch),
  )

  const totalStudents = routeStudents.length || route.student_count || 0
  const routeAttendance = attendanceForStudents(routeStudents)
  const tripDuration = getRouteTripDurationDisplay(route.id, allTrips)
  const morningTimes = interpolateTimes(orderedStops, MORNING_START, MORNING_END)
  const eveningTimes = interpolateTimes(orderedStops, EVENING_START, EVENING_END)

  function handleDragStart(e: React.DragEvent, studentId: string) {
    setDragStudentId(studentId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDragStudentId(null)
    setDragOverStopId(null)
    setDragOverRouteId(null)
  }

  function assignStudentToStop(studentId: string, stopId: string) {
    setStudentStopMap((prev) => ({ ...prev, [studentId]: stopId }))
  }

  function handleStopDrop(e: React.DragEvent, stopId: string) {
    e.preventDefault()
    if (dragStudentId) assignStudentToStop(dragStudentId, stopId)
    handleDragEnd()
  }

  function handleRouteDrop(e: React.DragEvent, routeName: string, routeId: string) {
    e.preventDefault()
    if (!dragStudentId) return
    moveStudentsToRoute([dragStudentId], routeName, routeId)
    handleDragEnd()
  }

  function moveStudentsToRoute(studentIds: string[], routeName: string, routeId: string, stopId?: string) {
    setSchoolStudents((prev) =>
      prev.map((s) =>
        studentIds.includes(s.id) ? { ...s, route_name: routeName } : s,
      ),
    )
    const destRoute = sameTypeRoutes.find((r) => r.id === routeId)
    const destStops = [...(destRoute?.stops ?? [])].sort((a, b) => a.order_index - b.order_index)
    const resolvedStopId = stopId ?? destStops[0]?.id
    if (resolvedStopId) {
      setStudentStopMap((prev) => {
        const next = { ...prev }
        studentIds.forEach((sid) => { next[sid] = resolvedStopId })
        return next
      })
    } else if (routeId !== route.id) {
      setStudentStopMap((prev) => {
        const next = { ...prev }
        studentIds.forEach((sid) => { delete next[sid] })
        return next
      })
    }
  }

  function unassignStudents(studentIds: string[]) {
    setSchoolStudents((prev) =>
      prev.map((s) =>
        studentIds.includes(s.id) ? { ...s, route_name: undefined } : s,
      ),
    )
    setStudentStopMap((prev) => {
      const next = { ...prev }
      studentIds.forEach((sid) => { delete next[sid] })
      return next
    })
  }

  function handleAddStop() {
    if (!newStopName.trim()) return
    const newStop: Stop = {
      id: `stop_${route.id}_${Date.now()}`,
      route_id: route.id,
      name: newStopName.trim(),
      latitude: 25.1,
      longitude: 55.2,
      order_index: stops.length + 1,
      estimated_time: newStopTime.trim() || undefined,
      student_count: 0,
    }
    setStops((prev) => [...prev, newStop])
    setNewStopName('')
    setNewStopTime('')
    setAddStopOpen(false)
  }

  function handleSaveEditStop() {
    if (!editStopTarget || !editStopName.trim()) return
    setStops((prev) =>
      prev.map((s) =>
        s.id === editStopTarget.id
          ? { ...s, name: editStopName.trim(), estimated_time: editStopTime.trim() || undefined }
          : s,
      ),
    )
    setEditStopTarget(null)
  }

  function handleDeleteStop(stopId: string) {
    setStops((prev) => prev.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, order_index: i + 1 })))
    setStudentStopMap((prev) => {
      const next = { ...prev }
      Object.entries(next).forEach(([studentId, sid]) => {
        if (sid === stopId) delete next[studentId]
      })
      return next
    })
  }

  function handleAddStudentToStop(student: Student) {
    if (!addStudentStopId) return
    setSchoolStudents((prev) =>
      prev.map((s) =>
        s.id === student.id ? { ...s, route_name: route.name } : s,
      ),
    )
    assignStudentToStop(student.id, addStudentStopId)
    setAddStudentStopId(null)
    setAddStudentSearch('')
  }

  function handleRemoveStudent(studentId: string) {
    setSchoolStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, route_name: undefined } : s,
      ),
    )
    setStudentStopMap((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
  }

  function handleSaveEditStudent() {
    if (!editStudentTarget) return
    setSchoolStudents((prev) =>
      prev.map((s) =>
        s.id === editStudentTarget.id
          ? { ...s, class: editStudentClass, division: editStudentDivision }
          : s,
      ),
    )
    setEditStudentTarget(null)
  }

  return (
    <Layout>
      <PageHeader
        title={route.name}
        subtitle={`${route.start_point} → ${route.end_point}${route.bus_number ? ` · ${route.bus_number}` : ''}`}
        breadcrumbs={[
          { label: 'Buses', path: '/school-admin/buses' },
          { label: route.bus_number ?? 'Route', path: route.bus_id ? `/school-admin/buses/${route.bus_id}` : undefined },
          { label: route.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/school-admin/routes')}>
              <ArrowLeft size={15} /> Back
            </Button>
            {route.bus_id && (
              <Button variant="outline" onClick={() => navigate(`/school-admin/buses/${route.bus_id}`)}>
                <BusIcon size={15} /> Bus Details
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadRouteQR(route.name, route.id)}>
              <QrCode size={15} /> Download QR
            </Button>
            <button type="button" onClick={() => setIsActive((v) => !v)} className="focus:outline-none">
              <StatusBadge status={isActive ? 'active' : 'inactive'} />
            </button>
            <Badge
              className={cn(
                'capitalize font-semibold px-3 py-1',
                route.type === 'pickup'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                  : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
              )}
            >
              {route.type}
            </Badge>
          </div>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Attendance Today', value: `${routeAttendance.present}/${routeAttendance.total}`, icon: CalendarCheck },
          { label: 'Trip Time', value: tripDuration ? `${tripDuration.isLive ? '' : '✓ '}${tripDuration.label}` : '—', icon: Clock, isLong: tripDuration?.isLong },
          { label: 'Total Students', value: totalStudents, icon: Users },
          { label: 'Bus Number', value: route.bus_number ?? '—', icon: BusIcon },
          { label: 'Driver', value: route.driver_name ? route.driver_name.split(' ')[0] : '—', icon: User },
          { label: 'Total Stops', value: orderedStops.length, icon: MapPin },
        ].map(({ label, value, icon: Icon, isLong }) => (
          <motion.div key={label} variants={fadeUp}>
            <Card>
              <CardContent className="flex items-center gap-3 pt-5 pb-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <Icon size={19} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
                  <p className={cn(
                    'truncate text-lg font-bold tabular-nums',
                    isLong ? 'text-red-600 dark:text-red-400' : 'text-[var(--foreground)]',
                  )}>{value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Tabs defaultValue="stops">
        <TabsList className="mb-6">
          <TabsTrigger value="stops">Stops &amp; Students</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Between Routes</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* ── Stops & Students ─────────────────────────────────────────── */}
        <TabsContent value="stops">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Manage stops and students. Drag students between stops or use the actions on each row.
              </p>
              <Button onClick={() => setAddStopOpen(true)}>
                <Plus size={15} /> Add Stop
              </Button>
            </div>

            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
                <Navigation size={14} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">Start</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">{route.start_point}</p>
              </div>
            </div>

            {orderedStops.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <MapPin size={32} className="text-[var(--muted-foreground)]" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--muted-foreground)]">No stops yet. Add your first stop.</p>
                  <Button onClick={() => setAddStopOpen(true)}>
                    <Plus size={15} /> Add Stop
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orderedStops.map((stop, idx) => (
                <motion.div key={stop.id} variants={fadeUp}>
                  <StopCard
                    stop={stop}
                    orderNumber={idx + 1}
                    students={studentsByStop[stop.id] ?? []}
                    dragStudentId={dragStudentId}
                    isDragOver={dragOverStopId === stop.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStopId(stop.id) }}
                    onDragLeave={() => setDragOverStopId(null)}
                    onDrop={(e) => handleStopDrop(e, stop.id)}
                    onEditStop={() => {
                      setEditStopTarget(stop)
                      setEditStopName(stop.name)
                      setEditStopTime(stop.estimated_time ?? '')
                    }}
                    onDeleteStop={() => handleDeleteStop(stop.id)}
                    onAddStudent={() => setAddStudentStopId(stop.id)}
                    onEditStudent={(s) => {
                      setEditStudentTarget(s)
                      setEditStudentClass(s.class)
                      setEditStudentDivision(s.division)
                    }}
                    onRemoveStudent={handleRemoveStudent}
                    onViewStudent={(sid) => navigate(`/school-admin/students/${sid}`)}
                  />
                </motion.div>
              ))
            )}

            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Destination</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">{route.end_point}</p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* ── Transfer between routes ──────────────────────────────────── */}
        <TabsContent value="transfer">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-[var(--primary)]" />
                  Move Students Between Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RouteTransferPanel
                  currentRoute={route}
                  sameTypeRoutes={sameTypeRoutes}
                  studentsOnCurrentRoute={routeStudents}
                  allStudents={schoolStudents}
                  dragStudentId={dragStudentId}
                  dragOverRouteId={dragOverRouteId}
                  targetRouteId={targetRouteId}
                  targetStopId={targetStopId}
                  compareRouteId={compareRouteId}
                  transferSearch={transferSearch}
                  selectedStudentIds={selectedStudentIds}
                  transferMode={transferMode}
                  onTargetRouteChange={(rid) => {
                    setTargetRouteId(rid)
                    setTargetStopId('__auto__')
                  }}
                  onTargetStopChange={setTargetStopId}
                  onCompareRouteChange={setCompareRouteId}
                  onTransferSearchChange={setTransferSearch}
                  onSelectedStudentsChange={setSelectedStudentIds}
                  onTransferModeChange={setTransferMode}
                  onMoveStudents={moveStudentsToRoute}
                  onUnassignStudents={unassignStudents}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e, routeId) => { e.preventDefault(); setDragOverRouteId(routeId) }}
                  onDragLeave={() => setDragOverRouteId(null)}
                  onDrop={handleRouteDrop}
                />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Route Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--muted)]/40 p-4">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <Navigation size={16} className="text-[var(--primary)]" />
                      <div className="h-10 w-0.5 bg-gradient-to-b from-[var(--primary)] to-green-500 rounded-full" />
                      <MapPin size={16} className="text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">Start Point</p>
                        <p className="font-semibold text-[var(--foreground)] truncate">{route.start_point}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">End Point</p>
                        <p className="font-semibold text-[var(--foreground)] truncate">{route.end_point}</p>
                      </div>
                    </div>
                    <ArrowRight size={20} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Type</p>
                      <p className="mt-0.5 text-sm font-semibold capitalize text-[var(--foreground)]">{route.type}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Bus</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{route.bus_number ?? '—'}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] px-3 py-2.5 col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Driver</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{route.driver_name ?? '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stops Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orderedStops.map((stop, idx) => (
                    <div key={stop.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {idx + 1}. {stop.name}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {(studentsByStop[stop.id] ?? []).length} students
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ── Schedule ─────────────────────────────────────────────────── */}
        <TabsContent value="schedule">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Morning Schedule', start: MORNING_START, end: MORNING_END, times: morningTimes, color: 'amber' },
              { title: 'Evening Schedule', start: EVENING_START, end: EVENING_END, times: eveningTimes, color: 'indigo' },
            ].map(({ title, start, end, times, color }) => (
              <motion.div key={title} variants={fadeUp}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock size={16} className={`text-${color}-600`} />
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex justify-between text-sm">
                        <span className="text-[var(--foreground)]">{route.start_point}</span>
                        <span className="font-medium tabular-nums">{start}</span>
                      </li>
                      {orderedStops.map((stop, idx) => (
                        <li key={stop.id} className="flex justify-between text-sm">
                          <span className="text-[var(--foreground)]">{stop.name}</span>
                          <span className="text-[var(--muted-foreground)] tabular-nums">{times[idx] ?? '—'}</span>
                        </li>
                      ))}
                      <li className="flex justify-between text-sm font-medium">
                        <span className="text-[var(--foreground)]">{route.end_point}</span>
                        <span className="tabular-nums">{end}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add Stop Dialog */}
      <Dialog open={addStopOpen} onOpenChange={setAddStopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stop</DialogTitle>
            <DialogDescription>Add a new stop to {route.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-stop-name">Stop Name</Label>
              <Input id="new-stop-name" value={newStopName} onChange={(e) => setNewStopName(e.target.value)} placeholder="e.g. Al Wasl Road" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-stop-time">Estimated Time (optional)</Label>
              <Input id="new-stop-time" value={newStopTime} onChange={(e) => setNewStopTime(e.target.value)} placeholder="e.g. 7:25 AM" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddStop} disabled={!newStopName.trim()}>Add Stop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stop Dialog */}
      <Dialog open={editStopTarget !== null} onOpenChange={(v) => { if (!v) setEditStopTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stop</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Stop Name</Label>
              <Input value={editStopName} onChange={(e) => setEditStopName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Time</Label>
              <Input value={editStopTime} onChange={(e) => setEditStopTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStopTarget(null)}>Cancel</Button>
            <Button onClick={handleSaveEditStop}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student to Stop Dialog */}
      <Dialog open={addStudentStopId !== null} onOpenChange={(v) => { if (!v) setAddStudentStopId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to Stop</DialogTitle>
            <DialogDescription>Select a student to assign to this stop on {route.name}.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Search by name or roll number..." value={addStudentSearch} onChange={(e) => setAddStudentSearch(e.target.value)} />
          <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-[var(--border)] p-1">
            {filteredUnassigned.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No available students found.</p>
            ) : (
              filteredUnassigned.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleAddStudentToStop(s)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-[var(--primary)]/10 text-[var(--primary)]">{getInitials(s.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Class {s.class}{s.division} · {s.route_name ?? 'Unassigned'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editStudentTarget !== null} onOpenChange={(v) => { if (!v) setEditStudentTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>{editStudentTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Input value={editStudentClass} onChange={(e) => setEditStudentClass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select value={editStudentDivision} onValueChange={setEditStudentDivision}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['A', 'B', 'C', 'D'].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudentTarget(null)}>Cancel</Button>
            <Button onClick={handleSaveEditStudent}>Save</Button>
            {editStudentTarget && (
              <Button variant="secondary" onClick={() => navigate(`/school-admin/students/${editStudentTarget.id}`)}>
                Full Profile
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
