import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Download, Users, UserCheck, UserX, MoreVertical,
  Eye, Pencil, QrCode, Ban, Upload, FileDown,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInitials, downloadCSV } from '@/lib/utils'
import { CLASSES } from '@/lib/constants'
import { allStudents } from '@/lib/mockData'
import type { Student } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ---------------------------------------------------------------------------
// QR helpers
// ---------------------------------------------------------------------------

function downloadStudentQR(student: Student) {
  const canvas = document.createElement('canvas')
  canvas.width = 250
  canvas.height = 300
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 250, 300)
  ctx.fillStyle = '#000000'
  const data = student.id + student.name + student.roll_number
  for (let i = 0; i < 20; i++)
    for (let j = 0; j < 20; j++)
      if ((data.charCodeAt((i * 20 + j) % data.length) + i + j) % 2 === 0)
        ctx.fillRect(i * 10 + 25, j * 10 + 25, 10, 10)
  // finder patterns
  const fc = (x: number, y: number) => {
    ctx.fillRect(x, y, 70, 10)
    ctx.fillRect(x, y, 10, 70)
    ctx.fillRect(x + 60, y, 10, 70)
    ctx.fillRect(x, y + 60, 70, 10)
  }
  fc(25, 25)
  fc(155, 25)
  fc(25, 155)
  // student name below QR
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(student.name, 125, 240)
  ctx.font = '11px Arial'
  ctx.fillText(`Class ${student.class}${student.division} | Roll: ${student.roll_number}`, 125, 258)
  const link = document.createElement('a')
  link.download = `student-qr-${student.roll_number}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function downloadAllStudentQRs(students: Student[]) {
  students.forEach((s, i) => {
    setTimeout(() => downloadStudentQR(s), i * 200)
  })
}

// ---------------------------------------------------------------------------
// CSV bulk import
// ---------------------------------------------------------------------------

interface ImportedRow {
  name: string
  class: string
  division: string
  roll_number: string
  dob: string
  parent_name: string
  parent_phone: string
}

function parseCSV(text: string): ImportedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return {
      name: row['name'] ?? '',
      class: row['class'] ?? '',
      division: row['division'] ?? '',
      roll_number: row['roll_number'] ?? '',
      dob: row['dob'] ?? '',
      parent_name: row['parent_name'] ?? '',
      parent_phone: row['parent_phone'] ?? '',
    }
  })
}

// ---------------------------------------------------------------------------
// Bulk Import Dialog
// ---------------------------------------------------------------------------

function BulkImportDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  function handleDownloadTemplate() {
    const rows = [
      {
        name: 'Ahmed Hassan',
        class: '5',
        division: 'A',
        roll_number: '101',
        dob: '2015-04-12',
        parent_name: 'Hassan Ali',
        parent_phone: '+971501234567',
      },
    ] as Record<string, unknown>[]
    downloadCSV(rows, 'student-import-template')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setError('No data rows found. Make sure the file has a header row and at least one data row.')
          setPreview([])
        } else {
          setPreview(rows)
        }
      } catch {
        setError('Failed to parse CSV. Please check the file format.')
        setPreview([])
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    // In a real app this would call an API or update global state.
    // Here we just close the dialog — allStudents is static mock data.
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Download the CSV template, fill in student details, then upload the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Step 1 – template */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">Step 1 — Download template</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                CSV with headers: <code className="font-mono">name, class, division, roll_number, dob, parent_name, parent_phone</code>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileDown size={14} /> Download Template
            </Button>
          </div>

          {/* Step 2 – upload */}
          <div className="space-y-2">
            <Label>Step 2 — Upload filled CSV</Label>
            <div
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <span className="text-sm text-[var(--muted-foreground)]">
                {fileName || 'Click to browse CSV file…'}
              </span>
            </div>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Preview — {preview.length} student{preview.length !== 1 ? 's' : ''} found
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--muted)]/50 sticky top-0">
                    <tr>
                      {['Name', 'Class', 'Div', 'Roll', 'DOB', 'Parent', 'Phone'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-[var(--muted-foreground)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.class}</td>
                        <td className="px-3 py-1.5">{r.division}</td>
                        <td className="px-3 py-1.5">{r.roll_number}</td>
                        <td className="px-3 py-1.5">{r.dob}</td>
                        <td className="px-3 py-1.5">{r.parent_name}</td>
                        <td className="px-3 py-1.5">{r.parent_phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={preview.length === 0}
            >
              Import {preview.length > 0 ? `${preview.length} Students` : 'Students'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Students() {
  const navigate = useNavigate()
  const [classFilter, setClassFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const routes = useMemo(() => {
    const set = new Set<string>()
    allStudents.forEach((s) => s.route_name && set.add(s.route_name))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    return allStudents.filter((s) => {
      if (classFilter !== 'all' && s.class !== classFilter) return false
      if (routeFilter !== 'all' && s.route_name !== routeFilter) return false
      return true
    })
  }, [classFilter, routeFilter])

  const stats = useMemo(() => {
    const total = allStudents.length
    const active = allStudents.filter((s) => s.is_active).length
    const assigned = allStudents.filter((s) => s.route_name).length
    return { total, active, assigned }
  }, [])

  function handleExport() {
    const rows = filtered.map((s) => ({
      Name: s.name,
      Class: `${s.class}${s.division}`,
      'Roll No': s.roll_number,
      Guardian: s.parents[0]?.parent_name ?? '',
      Phone: s.parents[0]?.phone ?? '',
      Route: s.route_name ?? '',
      Status: s.is_active ? 'Active' : 'Inactive',
    }))
    downloadCSV(rows, 'students')
  }

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student',
      sortable: true,
      accessor: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{s.name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Class {s.class}-{s.division} · Roll {s.roll_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'guardian',
      header: 'Parent / Guardian',
      render: (s) => {
        const p = s.parents[0]
        if (!p) return <span className="text-[var(--muted-foreground)]">—</span>
        return (
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)] truncate">{p.parent_name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{p.phone}</p>
          </div>
        )
      },
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (s) =>
        s.route_name ? (
          <span className="text-sm text-[var(--foreground)]">{s.route_name}</span>
        ) : (
          <span className="text-sm text-[var(--muted-foreground)]">Not assigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/school-admin/students/${s.id}`)}>
                <Eye size={14} /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/school-admin/students/${s.id}/edit`)}>
                <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadStudentQR(s)}>
                <QrCode size={14} /> Download QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Ban size={14} /> {s.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show">
        <PageHeader
          title="Students"
          subtitle="Manage enrolled students, routes and guardians"
          actions={
            <>
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload size={16} /> Bulk Import
              </Button>
              <Button variant="outline" onClick={() => downloadAllStudentQRs(filtered)}>
                <QrCode size={16} /> Download All QRs
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download size={16} /> Export CSV
              </Button>
              <Button onClick={() => navigate('/school-admin/students/add')}>
                <Plus size={16} /> Add Student
              </Button>
            </>
          }
        />

        {/* Summary stats */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Total Students" value={stats.total} icon={Users} color="primary" />
          <StatsCard title="Active" value={stats.active} icon={UserCheck} color="success" />
          <StatsCard title="Route Assigned" value={stats.assigned} icon={UserX} color="info" subtitle={`${stats.total - stats.assigned} unassigned`} />
        </motion.div>

        {/* Filters + Table */}
        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            searchable
            searchKeys={['name', 'roll_number']}
            searchPlaceholder="Search students by name or roll no…"
            onRowClick={(s) => navigate(`/school-admin/students/${s.id}`)}
            emptyTitle="No students found"
            emptyDescription="Try adjusting your class or route filters."
            toolbar={
              <>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        </motion.div>
      </motion.div>

      <BulkImportDialog open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} />
    </Layout>
  )
}
