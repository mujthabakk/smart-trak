import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { GraduationCap, Plus, Trash2, X, AlertCircle, ChevronRight, Users } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  listClasses, createClass, deleteClass, addDivision, removeDivision, type SchoolClass,
} from '@/lib/api/classes'
import { listStudents } from '@/lib/api/students'
import type { Student } from '@/types'

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || fallback
  }
  return fallback
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

function DivisionAdder({ classId, onError }: { classId: string; onError: (msg: string) => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const mutation = useMutation({
    mutationFn: () => addDivision(classId, name.trim()),
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err) => onError(extractErrorMessage(err, 'Failed to add division.')),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate()
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. A"
        className="h-7 w-20 text-xs px-2"
        maxLength={10}
      />
      <Button type="submit" variant="outline" size="icon" className="h-7 w-7" disabled={!name.trim() || mutation.isPending}>
        <Plus size={13} />
      </Button>
    </form>
  )
}

function DivisionGroup({ division, students }: { division: string; students: Student[] }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[var(--muted)]/40 transition-colors"
      >
        <ChevronRight
          size={13}
          className={cn(
            'flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-150',
            expanded && 'rotate-90',
          )}
        />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]/60 flex-shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Division {division} · {students.length}
        </p>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/school-admin/students/${s.id}`)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 pl-[52px] text-left text-sm hover:bg-[var(--muted)]/60 transition-colors"
              >
                <span className="truncate text-[var(--foreground)]">{s.name}</span>
                <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0">#{s.roll_number}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClassStudentsList({ cls }: { cls: SchoolClass }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', 'by-class', cls.name],
    queryFn: () => listStudents({ class: cls.name, pageSize: 500 }),
  })
  const students = data?.students ?? []

  const groups = new Map<string, Student[]>()
  for (const s of students) {
    const key = s.division || '—'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }
  const divisionOrder = cls.divisions.map((d) => d.name)
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const ia = divisionOrder.indexOf(a)
    const ib = divisionOrder.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  if (isError) {
    return <p className="px-4 py-3 text-xs text-[var(--destructive)]">Failed to load students for this class.</p>
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-5"><LoadingSpinner size="sm" /></div>
  }
  if (students.length === 0) {
    return <p className="px-4 py-3 text-xs text-[var(--muted-foreground)]">No students in this class yet.</p>
  }

  return (
    <div className="divide-y divide-[var(--border)]/60">
      {sortedKeys.map((division) => (
        <DivisionGroup key={division} division={division} students={groups.get(division)!} />
      ))}
    </div>
  )
}

function ClassRow({ cls, isLast, onError }: { cls: SchoolClass; isLast: boolean; onError: (msg: string) => void }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const deleteClassMutation = useMutation({
    mutationFn: () => deleteClass(cls.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
    onError: (err) => onError(extractErrorMessage(err, 'Failed to delete class.')),
  })

  const removeDivisionMutation = useMutation({
    mutationFn: (divisionId: string) => removeDivision(cls.id, divisionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
    onError: (err) => onError(extractErrorMessage(err, 'Failed to remove division.')),
  })

  function handleDeleteClass(e: React.MouseEvent) {
    e.stopPropagation()
    if (window.confirm(`Delete Class ${cls.name}? This does not affect students already assigned to it.`)) {
      deleteClassMutation.mutate()
    }
  }

  return (
    <div className={cn(!isLast && 'border-b border-[var(--border)]')}>
      {/* Row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]/40 transition-colors"
      >
        <ChevronRight
          size={15}
          className={cn(
            'flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-150',
            expanded && 'rotate-90',
          )}
        />
        <div className="h-7 w-7 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
          <GraduationCap size={14} />
        </div>
        <span className="font-medium text-sm text-[var(--foreground)] flex-shrink-0">Class {cls.name}</span>

        <div className="flex-1 flex flex-wrap items-center gap-1 min-w-0">
          {cls.divisions.length === 0 ? (
            <span className="text-xs text-[var(--muted-foreground)]">No divisions</span>
          ) : (
            cls.divisions.map((d) => (
              <Badge key={d.id} variant="secondary" className="text-[11px] px-1.5 py-0">{d.name}</Badge>
            ))
          )}
        </div>

        <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] flex-shrink-0">
          <Users size={12} /> {cls.divisions.length} div.
        </span>

        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)] flex-shrink-0"
          onClick={handleDeleteClass} loading={deleteClassMutation.isPending}
        >
          <Trash2 size={14} />
        </Button>
      </button>

      {/* Accordion content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden bg-[var(--muted)]/20"
          >
            <div className="border-t border-[var(--border)] pl-9">
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border)]/60">
                <span className="text-xs text-[var(--muted-foreground)] mr-1">Divisions:</span>
                {cls.divisions.map((d) => (
                  <Badge key={d.id} variant="secondary" className="gap-1 pr-1">
                    {d.name}
                    <button
                      type="button"
                      onClick={() => removeDivisionMutation.mutate(d.id)}
                      className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                <DivisionAdder classId={cls.id} onError={onError} />
              </div>
              <ClassStudentsList cls={cls} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Classes() {
  const queryClient = useQueryClient()
  const [newClassName, setNewClassName] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['classes'],
    queryFn: listClasses,
  })
  const classes = data?.classes ?? []

  const createClassMutation = useMutation({
    mutationFn: () => createClass(newClassName.trim()),
    onSuccess: () => {
      setNewClassName('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err) => setError(extractErrorMessage(err, 'Failed to add class.')),
  })

  function handleAddClass(e: React.FormEvent) {
    e.preventDefault()
    if (!newClassName.trim()) return
    createClassMutation.mutate()
  }

  return (
    <Layout>
      <PageHeader
        title="Classes & Divisions"
        subtitle="Define the classes and divisions students can be assigned to"
      />

      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleAddClass} className="flex items-end gap-2">
            <div className="flex-1 max-w-xs space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Add a class</label>
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. 1, KG 1, Nursery"
                maxLength={30}
              />
            </div>
            <Button type="submit" disabled={!newClassName.trim()} loading={createClassMutation.isPending}>
              <Plus size={15} /> Add Class
            </Button>
          </form>
        </CardContent>
      </Card>

      {isError ? (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          Failed to load classes. Please try again.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Add your school's classes above, then add divisions (like A, B, C) under each one."
        />
      ) : (
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
        >
          {/* List header */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[var(--muted)]/40 border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <span className="w-[15px]" />
            <span className="w-7" />
            <span className="w-[90px]">Class</span>
            <span className="flex-1">Divisions</span>
            <span className="w-16" />
            <span className="w-7" />
          </div>
          {classes.map((cls, i) => (
            <motion.div key={cls.id} variants={item}>
              <ClassRow cls={cls} isLast={i === classes.length - 1} onError={setError} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </Layout>
  )
}
