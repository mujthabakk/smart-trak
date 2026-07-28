import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, ArrowLeft, Bus as BusIcon, CheckCircle, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { generateId } from '@/lib/utils'
import { createBuses, type BusInput } from '@/lib/api/buses'

interface BusRow {
  id: string
  bus_number: string
  make_model: string
  year: string
  seat_capacity: string
  insurance_expiry: string
  fitness_cert_expiry: string
  valid: boolean
}

function emptyRow(): BusRow {
  return {
    id: generateId(),
    bus_number: '',
    make_model: '',
    year: '',
    seat_capacity: '',
    insurance_expiry: '',
    fitness_cert_expiry: '',
    valid: false,
  }
}

function validateRow(row: BusRow): boolean {
  return row.bus_number.trim().length > 0 && Number(row.seat_capacity) > 0
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Failed to save buses. Please try again.'
  }
  return 'Failed to save buses. Please try again.'
}

export default function AddBus() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<BusRow[]>([emptyRow()])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (buses: BusInput[]) => createBuses(buses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] })
      setSaved(true)
      setTimeout(() => {
        navigate('/school-admin/buses')
      }, 1800)
    },
    onError: (err) => {
      setError(extractErrorMessage(err))
    },
  })

  function updateRow(id: string, field: keyof BusRow, value: string) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }
      updated.valid = validateRow(updated)
      return updated
    }))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(id: string) {
    if (rows.length === 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function handleSave() {
    const valid = rows.filter((r) => r.valid)
    if (valid.length === 0) return
    setError(null)
    const payload: BusInput[] = valid.map((r) => ({
      bus_number: r.bus_number,
      seat_capacity: Number(r.seat_capacity),
      make_model: r.make_model || undefined,
      year: r.year ? Number(r.year) : undefined,
      insurance_expiry: r.insurance_expiry || undefined,
      fitness_cert_expiry: r.fitness_cert_expiry || undefined,
    }))
    saveMutation.mutate(payload)
  }

  const validCount = rows.filter((r) => r.valid).length

  if (saved) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <CheckCircle size={56} className="text-green-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">{validCount} bus{validCount !== 1 ? 'es' : ''} added successfully!</h2>
          <p className="text-[var(--muted-foreground)] text-sm">Redirecting to fleet…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/school-admin/buses')}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Add Buses</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Add one or more buses line by line. Required: Bus Number and Seat Capacity.</p>
          </div>
          <div className="flex items-center gap-3">
            {validCount > 0 && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {validCount} ready to save
              </Badge>
            )}
            <Button onClick={handleSave} disabled={validCount === 0 || saveMutation.isPending} loading={saveMutation.isPending}>
              <Save size={16} /> Save {validCount > 0 ? `${validCount} Bus${validCount !== 1 ? 'es' : ''}` : 'Buses'}
            </Button>
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div
            variants={item}
            className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40"
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </motion.div>
        )}

        {/* Column headers */}
        <motion.div variants={item} className="grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_40px] gap-3 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          <span>Bus Number *</span>
          <span>Make / Model</span>
          <span>Year</span>
          <span>Seats *</span>
          <span>Insurance Expiry</span>
          <span>Fitness Cert</span>
          <span />
        </motion.div>

        {/* Rows */}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((row, index) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr_1.5fr_40px] gap-3 items-center rounded-xl border px-4 py-3 transition-colors ${
                  row.valid
                    ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <div className="relative">
                  {index === 0 && (
                    <span className="absolute -top-5 left-0 text-[10px] text-[var(--muted-foreground)] font-medium">Row {index + 1}</span>
                  )}
                  <Input
                    placeholder="e.g. BUS-005"
                    value={row.bus_number}
                    onChange={(e) => updateRow(row.id, 'bus_number', e.target.value)}
                    className="h-9"
                  />
                </div>
                <Input
                  placeholder="e.g. Toyota Coaster"
                  value={row.make_model}
                  onChange={(e) => updateRow(row.id, 'make_model', e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  placeholder="2024"
                  min={1980}
                  max={2099}
                  value={row.year}
                  onChange={(e) => updateRow(row.id, 'year', e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  placeholder="30"
                  min={1}
                  value={row.seat_capacity}
                  onChange={(e) => updateRow(row.id, 'seat_capacity', e.target.value)}
                  className="h-9"
                />
                <Input
                  type="date"
                  value={row.insurance_expiry}
                  onChange={(e) => updateRow(row.id, 'insurance_expiry', e.target.value)}
                  className="h-9"
                />
                <Input
                  type="date"
                  value={row.fitness_cert_expiry}
                  onChange={(e) => updateRow(row.id, 'fitness_cert_expiry', e.target.value)}
                  className="h-9"
                />
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add row button */}
        <motion.div variants={item}>
          <button
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
          >
            <Plus size={16} /> Add another bus
          </button>
        </motion.div>

        {/* Summary */}
        {rows.length > 1 && (
          <motion.div variants={item} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <BusIcon size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--foreground)]">{rows.length} rows total</p>
                <p className="text-xs text-[var(--muted-foreground)]">{validCount} valid · {rows.length - validCount} incomplete</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={validCount === 0 || saveMutation.isPending} loading={saveMutation.isPending} size="lg">
              <Save size={16} /> Save {validCount} Bus{validCount !== 1 ? 'es' : ''}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  )
}
