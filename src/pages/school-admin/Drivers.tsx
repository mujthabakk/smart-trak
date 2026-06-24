import { useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, UserCheck, Users, Navigation, AlertTriangle, MoreVertical,
  Eye, Pencil, Ban, Phone, BadgeCheck, Upload,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInitials, formatDate, daysUntil, downloadCSV } from '@/lib/utils'
import { allDrivers } from '@/lib/mockData'
import type { Driver } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const EXPIRY_WINDOW_DAYS = 90

function busIsOnTrip(_busId?: string): boolean {
  return false
}

// ── Dialog state types ────────────────────────────────────────────────────────

type AddForm = {
  name: string
  employee_id: string
  email: string
  phone: string
  license_number: string
  license_expiry: string
}

const emptyAddForm = (): AddForm => ({
  name: '',
  employee_id: '',
  email: '',
  phone: '',
  license_number: '',
  license_expiry: '',
})

type EditForm = {
  name: string
  email: string
  phone: string
  license_number: string
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>(allDrivers)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm())

  // Bulk import dialog
  const [importOpen, setImportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View dialog
  const [viewDriver, setViewDriver] = useState<Driver | null>(null)

  // Edit dialog
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', license_number: '' })

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = drivers.length
    const active = drivers.filter((d) => d.is_active).length
    const onTrip = drivers.filter((d) => d.is_active && busIsOnTrip(d.assigned_bus_id)).length
    const expiring = drivers.filter((d) => daysUntil(d.license_expiry) <= EXPIRY_WINDOW_DAYS).length
    return { total, active, onTrip, expiring }
  }, [drivers])

  // ── Add driver ──────────────────────────────────────────────────────────────

  function handleAddSubmit() {
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      school_id: drivers[0]?.school_id ?? 'school-1',
      name: addForm.name.trim(),
      employee_id: addForm.employee_id.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.trim(),
      whatsapp: addForm.phone.trim(),
      license_number: addForm.license_number.trim(),
      license_expiry: addForm.license_expiry,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    setDrivers((prev) => [newDriver, ...prev])
    setAddOpen(false)
    setAddForm(emptyAddForm())
  }

  // ── Bulk import ─────────────────────────────────────────────────────────────

  function handleDownloadTemplate() {
    downloadCSV(
      [{ name: 'John Doe', employee_id: 'EMP001', email: 'john@example.com', phone: '+1234567890', license_number: 'LIC123456', license_expiry: '2026-12-31' }],
      'drivers_template',
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      // skip header
      const dataLines = lines.slice(1)
      const imported: Driver[] = dataLines.map((line, idx) => {
        const [name, employee_id, email, phone, license_number, license_expiry] = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
        return {
          id: `drv-import-${Date.now()}-${idx}`,
          school_id: drivers[0]?.school_id ?? 'school-1',
          name: name ?? '',
          employee_id: employee_id ?? '',
          email: email ?? '',
          phone: phone ?? '',
          whatsapp: phone ?? '',
          license_number: license_number ?? '',
          license_expiry: license_expiry ?? '',
          is_active: true,
          created_at: new Date().toISOString(),
        }
      }).filter((d) => d.name)
      setDrivers((prev) => [...imported, ...prev])
      setImportOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  // ── Edit driver ─────────────────────────────────────────────────────────────

  function openEdit(d: Driver) {
    setEditDriver(d)
    setEditForm({ name: d.name, email: d.email, phone: d.phone, license_number: d.license_number })
  }

  function handleEditSave() {
    if (!editDriver) return
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === editDriver.id
          ? { ...d, name: editForm.name.trim(), email: editForm.email.trim(), phone: editForm.phone.trim(), license_number: editForm.license_number.trim() }
          : d,
      ),
    )
    setEditDriver(null)
  }

  // ── Toggle active ───────────────────────────────────────────────────────────

  function toggleActive(id: string) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: !d.is_active } : d)))
  }

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Driver',
      sortable: true,
      accessor: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials(d.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{d.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Phone size={11} /> {d.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'license',
      header: 'License',
      render: (d) => {
        const days = daysUntil(d.license_expiry)
        const expired = days < 0
        const soon = !expired && days <= EXPIRY_WINDOW_DAYS
        return (
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)] flex items-center gap-1.5">
              <BadgeCheck size={13} className="text-[var(--muted-foreground)]" />
              {d.license_number}
            </p>
            <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-[var(--muted-foreground)]'}`}>
              {expired ? 'Expired ' : 'Expires '}{formatDate(d.license_expiry)}
              {soon && !expired && ' ⚠'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        if (d.is_active && busIsOnTrip(d.assigned_bus_id)) {
          return <StatusBadge status="running" />
        }
        return <StatusBadge status={d.is_active ? 'active' : 'inactive'} />
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (d) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewDriver(d)}>
                <Eye size={14} /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(d)}>
                <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => toggleActive(d.id)}>
                <Ban size={14} /> {d.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show">
        <PageHeader
          title="Drivers"
          subtitle="Driver roster, license tracking and bus assignments"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload size={16} /> Bulk Import
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add Driver
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Drivers" value={stats.total} icon={Users} color="primary" />
          <StatsCard title="Active" value={stats.active} icon={UserCheck} color="success" />
          <StatsCard title="On Trip" value={stats.onTrip} icon={Navigation} color="info" />
          <StatsCard title="License Expiring" value={stats.expiring} icon={AlertTriangle} color="warning" subtitle="Within 90 days" />
        </motion.div>

        {/* Table */}
        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={drivers}
            keyField="id"
            searchable
            searchKeys={['name', 'phone', 'license_number', 'employee_id']}
            searchPlaceholder="Search drivers by name, phone or license…"
            onRowClick={(d) => setViewDriver(d)}
            emptyTitle="No drivers found"
            emptyDescription="Add a driver to start assigning routes."
          />
        </motion.div>
      </motion.div>

      {/* ── Add Driver Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                placeholder="John Doe"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-emp-id">Employee ID</Label>
              <Input
                id="add-emp-id"
                placeholder="EMP001"
                value={addForm.employee_id}
                onChange={(e) => setAddForm((f) => ({ ...f, employee_id: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="john@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                placeholder="+1234567890"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-license">License Number</Label>
              <Input
                id="add-license"
                placeholder="LIC123456"
                value={addForm.license_number}
                onChange={(e) => setAddForm((f) => ({ ...f, license_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-expiry">License Expiry</Label>
              <Input
                id="add-expiry"
                type="date"
                value={addForm.license_expiry}
                onChange={(e) => setAddForm((f) => ({ ...f, license_expiry: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={!addForm.name.trim()}>Add Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Import Dialog ────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Import Drivers</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">1. Download Template</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Download the CSV template, fill in driver details, then upload it below.
              </p>
              <Button variant="outline" className="w-fit" onClick={handleDownloadTemplate}>
                Download Template
              </Button>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">2. Upload CSV</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Select your completed CSV file to import drivers.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-sm text-[var(--foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[var(--border)] file:text-sm file:font-medium file:bg-[var(--background)] file:text-[var(--foreground)] hover:file:bg-[var(--accent)] cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Driver Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!viewDriver} onOpenChange={(open) => { if (!open) setViewDriver(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {viewDriver && (
            <div className="grid gap-3 py-2">
              <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{getInitials(viewDriver.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{viewDriver.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{viewDriver.employee_id}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">Email</dt>
                  <dd className="text-[var(--foreground)] break-all">{viewDriver.email}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">Phone</dt>
                  <dd className="text-[var(--foreground)]">{viewDriver.phone}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">License No.</dt>
                  <dd className="text-[var(--foreground)]">{viewDriver.license_number}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">License Expiry</dt>
                  <dd className={`${daysUntil(viewDriver.license_expiry) < 0 ? 'text-red-600 font-medium' : daysUntil(viewDriver.license_expiry) <= EXPIRY_WINDOW_DAYS ? 'text-amber-600 font-medium' : 'text-[var(--foreground)]'}`}>
                    {formatDate(viewDriver.license_expiry)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">Status</dt>
                  <dd><StatusBadge status={viewDriver.is_active ? 'active' : 'inactive'} /></dd>
                </div>
                {viewDriver.assigned_bus_number && (
                  <div>
                    <dt className="text-[var(--muted-foreground)] text-xs uppercase tracking-wide mb-0.5">Assigned Bus</dt>
                    <dd className="text-[var(--foreground)]">{viewDriver.assigned_bus_number}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDriver(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Driver Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!editDriver} onOpenChange={(open) => { if (!open) setEditDriver(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-license">License Number</Label>
              <Input
                id="edit-license"
                value={editForm.license_number}
                onChange={(e) => setEditForm((f) => ({ ...f, license_number: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editForm.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
