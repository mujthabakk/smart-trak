import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { GraduationCap, Plus, Trash2, X, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  listClasses, createClass, deleteClass, addDivision, removeDivision, type SchoolClass,
} from '@/lib/api/classes'

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || fallback
  }
  return fallback
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

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
    <form onSubmit={submit} className="flex items-center gap-1.5">
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

function ClassCard({ cls, onError }: { cls: SchoolClass; onError: (msg: string) => void }) {
  const queryClient = useQueryClient()

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

  function handleDeleteClass() {
    if (window.confirm(`Delete Class ${cls.name}? This does not affect students already assigned to it.`)) {
      deleteClassMutation.mutate()
    }
  }

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <GraduationCap size={15} />
            </div>
            Class {cls.name}
          </CardTitle>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
            onClick={handleDeleteClass} loading={deleteClassMutation.isPending}
          >
            <Trash2 size={14} />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-1.5">
          {cls.divisions.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mr-1">No divisions yet.</p>
          )}
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
        </CardContent>
      </Card>
    </motion.div>
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
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} onError={setError} />
          ))}
        </motion.div>
      )}
    </Layout>
  )
}
