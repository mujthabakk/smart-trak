import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  School as SchoolIcon, Plus, Upload, CheckCircle, Clock, Ban, Download, FileSpreadsheet,
  MoreHorizontal, Eye, Pencil, Power, Trash2, Users, Bus, Bell, FileText, Send,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatNumber, getInitials, generateId, formatCurrency } from '@/lib/utils'
import { mockSchools, mockPlans } from '@/lib/mockData'
import type { School } from '@/types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const PLAN_VARIANT: Record<string, 'muted' | 'info' | 'secondary'> = { basic: 'muted', standard: 'info', premium: 'secondary' }

const TEMPLATE = mockSchools[0]

interface FormState {
  name: string
  admin_name: string
  admin_email: string
  phone: string
  website: string
  plan_name: string
  address: string
  city: string
  state: string
  post_code: string
  country: string
  student_count: string
  bus_count: string
  driver_count: string
}
const EMPTY_FORM: FormState = {
  name: '', admin_name: '', admin_email: '', phone: '', website: '',
  plan_name: 'standard', address: '', city: '', state: '', post_code: '', country: 'UAE',
  student_count: '', bus_count: '', driver_count: '',
}

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof SchoolIcon; accent: string }) {
  return (
    <motion.div variants={item} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted-foreground)] font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
      </div>
    </motion.div>
  )
}

export default function Schools() {
  const navigate = useNavigate()
  const [schools, setSchools] = useState<School[]>(mockSchools)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [importOpen, setImportOpen] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Payment / Invoice dialog state
  const [paymentTarget, setPaymentTarget] = useState<School | null>(null)
  const [paymentMode, setPaymentMode] = useState<'alert' | 'invoice' | null>(null)
  const [paymentSent, setPaymentSent] = useState(false)

  const counts = useMemo(() => ({
    total: schools.length,
    active: schools.filter((s) => s.status === 'active').length,
    pending: schools.filter((s) => s.status === 'pending').length,
    suspended: schools.filter((s) => s.status === 'suspended').length,
  }), [schools])

  // Live cost calculation for the add/edit form
  const selectedPlan = useMemo(
    () => mockPlans.find((p) => p.name === form.plan_name) ?? null,
    [form.plan_name],
  )
  const estimatedCost = useMemo(() => {
    const n = parseInt(form.student_count) || 0
    if (!selectedPlan || n <= 0) return null
    const studentCost = n * selectedPlan.price_per_student
    const monthly = selectedPlan.price_monthly + studentCost
    const annual = selectedPlan.price_annual + studentCost * 12
    return { monthly, annual, studentCost, base: selectedPlan.price_monthly, n, rate: selectedPlan.price_per_student }
  }, [form.student_count, selectedPlan])

  // Invoice amount for the selected school
  const invoiceAmount = useMemo(() => {
    if (!paymentTarget) return 0
    const plan = mockPlans.find((p) => p.name.toLowerCase() === paymentTarget.plan_name.toLowerCase())
    if (!plan) return 0
    const studentCost = (paymentTarget.student_count ?? 0) * plan.price_per_student
    return plan.price_monthly + studentCost
  }, [paymentTarget])

  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true) }
  function openEdit(row: School) {
    setEditingId(row.id)
    setForm({
      name: row.name,
      admin_name: row.admin_name ?? '',
      admin_email: row.admin_email ?? row.email ?? '',
      phone: row.phone ?? '',
      website: row.website ?? '',
      plan_name: row.plan_name?.toLowerCase() ?? 'standard',
      address: row.address ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      post_code: row.post_code ?? '',
      country: row.country ?? 'UAE',
      student_count: String(row.student_count ?? ''),
      bus_count: String(row.bus_count ?? ''),
      driver_count: String(row.driver_count ?? ''),
    })
    setFormOpen(true)
  }

  function openPayment(row: School, mode: 'alert' | 'invoice') {
    setPaymentTarget(row)
    setPaymentMode(mode)
    setPaymentSent(false)
  }
  function closePayment() { setPaymentTarget(null); setPaymentMode(null); setPaymentSent(false) }
  function confirmSend() { setPaymentSent(true) }

  function saveSchool(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.admin_email.trim()) return
    const planLabel = form.plan_name.charAt(0).toUpperCase() + form.plan_name.slice(1)
    const commonFields = {
      name: form.name,
      admin_name: form.admin_name || undefined,
      admin_email: form.admin_email,
      email: form.admin_email,
      phone: form.phone || '—',
      website: form.website || undefined,
      plan_name: planLabel,
      address: form.address || '—',
      city: form.city || '—',
      state: form.state || '—',
      post_code: form.post_code || undefined,
      country: form.country || 'UAE',
      student_count: Number(form.student_count) || 0,
      bus_count: Number(form.bus_count) || 0,
      driver_count: Number(form.driver_count) || 0,
    }
    if (editingId) {
      setSchools((list) => list.map((s) => s.id === editingId ? { ...s, ...commonFields } : s))
    } else {
      const created: School = {
        ...TEMPLATE,
        ...commonFields,
        id: `SCH-${generateId()}`,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
      setSchools((list) => [created, ...list])
    }
    setFormOpen(false)
  }

  function toggleSuspend(row: School) {
    setSchools((list) => list.map((s) => s.id === row.id ? { ...s, status: s.status === 'suspended' ? 'active' : 'suspended' } : s))
  }
  function removeSchool(row: School) {
    if (window.confirm(`Delete ${row.name}? This cannot be undone.`)) {
      setSchools((list) => list.filter((s) => s.id !== row.id))
    }
  }

  function downloadTemplate() {
    const csv = [
      'name,admin_email,plan,city,address,student_count,bus_count',
      'Riverside Public School,admin@riverside.ae,standard,Dubai,45 Sheikh Zayed Road,420,12',
      'Oakwood Academy,admin@oakwood.ae,premium,Abu Dhabi,12 Knowledge Village,880,20',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smarttrack_school_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const rows = lines.slice(1)
      const created: School[] = rows.map((line) => {
        const [name, email, plan, city, address, students, buses] = line.split(',').map((c) => c.trim())
        const planLabel = (plan || 'basic')
        return {
          ...TEMPLATE,
          id: `SCH-${generateId()}`,
          name: name || 'Imported School',
          admin_email: email || '',
          email: email || '',
          plan_name: planLabel.charAt(0).toUpperCase() + planLabel.slice(1),
          status: 'pending',
          city: city || '—',
          address: address || '—',
          student_count: Number(students) || 0,
          bus_count: Number(buses) || 0,
          created_at: new Date().toISOString(),
        }
      })
      if (created.length) setSchools((list) => [...created, ...list])
      setImportMsg(`${created.length} school${created.length === 1 ? '' : 's'} imported as pending.`)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const columns: Column<School>[] = [
    {
      key: 'name', header: 'School', sortable: true, accessor: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{row.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{row.admin_email ?? row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'address', header: 'Address', accessor: (row) => row.address,
      render: (row) => (
        <div className="min-w-0 max-w-[180px]">
          <p className="text-sm text-[var(--foreground)] truncate">{row.address || '—'}</p>
          <p className="text-xs text-[var(--muted-foreground)] truncate">{row.city}{row.state && row.state !== row.city ? `, ${row.state}` : ''}</p>
        </div>
      ),
    },
    { key: 'plan_name', header: 'Plan', sortable: true, accessor: (row) => row.plan_name, render: (row) => <Badge variant={PLAN_VARIANT[row.plan_name.toLowerCase()] ?? 'muted'}>{row.plan_name}</Badge> },
    { key: 'status', header: 'Status', sortable: true, accessor: (row) => row.status, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'student_count', header: 'Students', sortable: true, accessor: (row) => row.student_count, render: (row) => <span className="inline-flex items-center gap-1.5 text-[var(--foreground)] tabular-nums"><Users size={14} className="text-[var(--muted-foreground)]" />{formatNumber(row.student_count)}</span> },
    { key: 'bus_count', header: 'Buses', sortable: true, accessor: (row) => row.bus_count, render: (row) => <span className="inline-flex items-center gap-1.5 text-[var(--foreground)] tabular-nums"><Bus size={14} className="text-[var(--muted-foreground)]" />{row.bus_count}</span> },
    { key: 'created_at', header: 'Created', sortable: true, accessor: (row) => row.created_at, render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.created_at)}</span> },
    {
      key: 'actions', header: '', className: 'text-right w-12',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/super-admin/schools/${row.id}`)}><Eye size={14} /> View Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/super-admin/schools/${row.id}`)}><Pencil size={14} /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSuspend(row)}><Power size={14} />{row.status === 'suspended' ? 'Reactivate' : 'Suspend'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openPayment(row, 'alert')}><Bell size={14} /> Send Payment Alert</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPayment(row, 'invoice')}><FileText size={14} /> Send Invoice</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => removeSchool(row)}><Trash2 size={14} /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <PageHeader
        title="Schools"
        subtitle="Manage all registered schools"
        actions={
          <>
            <Button variant="outline" onClick={() => { setImportMsg(''); setImportOpen(true) }}><Upload size={16} /> Bulk Import</Button>
            <Button onClick={openAdd}><Plus size={16} /> Add School</Button>
          </>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="Total Schools" value={counts.total} icon={SchoolIcon} accent="bg-[var(--primary)]/10 text-[var(--primary)]" />
          <MiniStat label="Active" value={counts.active} icon={CheckCircle} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <MiniStat label="Pending" value={counts.pending} icon={Clock} accent="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
          <MiniStat label="Suspended" value={counts.suspended} icon={Ban} accent="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        </motion.div>

        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={schools}
            keyField="id"
            searchable
            searchKeys={['name', 'admin_email', 'email', 'city', 'address']}
            searchPlaceholder="Search schools…"
            onRowClick={(row) => navigate(`/super-admin/schools/${row.id}`)}
            emptyTitle="No schools found"
            emptyDescription="Add a school or adjust your search."
          />
        </motion.div>
      </motion.div>

      {/* ── Add / Edit School Dialog ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit School' : 'Add School'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the school details.' : 'Manually onboard a school. It starts as pending until approved.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSchool} className="space-y-5">

            {/* ── School Info ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">School Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="sc-name">School name *</Label>
                  <Input id="sc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Greenfield Academy" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-phone">Phone number</Label>
                  <Input id="sc-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+971-4-555-0100" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-website">Website</Label>
                  <Input id="sc-website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="www.school.ae" />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* ── Admin Contact ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Admin Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sc-admin-name">Admin name</Label>
                  <Input id="sc-admin-name" value={form.admin_name} onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))} placeholder="Hassan Al-Rashid" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-email">Admin email *</Label>
                  <Input id="sc-email" type="email" value={form.admin_email} onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))} placeholder="admin@school.ae" required />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* ── Address Details ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Address Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="sc-address">Street address</Label>
                  <Input id="sc-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="45 Sheikh Zayed Road" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-city">City</Label>
                  <Input id="sc-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Dubai" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-state">State / Emirate</Label>
                  <Input id="sc-state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Dubai" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-postcode">Post / ZIP code</Label>
                  <Input id="sc-postcode" value={form.post_code} onChange={(e) => setForm((f) => ({ ...f, post_code: e.target.value }))} placeholder="00000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-country">Country</Label>
                  <Input id="sc-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="UAE" />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* ── Plan & Capacity ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Plan & Capacity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={form.plan_name} onValueChange={(v) => setForm((f) => ({ ...f, plan_name: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-students">Students</Label>
                  <Input id="sc-students" type="number" min={0} value={form.student_count} onChange={(e) => setForm((f) => ({ ...f, student_count: e.target.value }))} placeholder="350" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-buses">Buses</Label>
                  <Input id="sc-buses" type="number" min={0} value={form.bus_count} onChange={(e) => setForm((f) => ({ ...f, bus_count: e.target.value }))} placeholder="8" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-drivers">Drivers</Label>
                  <Input id="sc-drivers" type="number" min={0} value={form.driver_count} onChange={(e) => setForm((f) => ({ ...f, driver_count: e.target.value }))} placeholder="6" />
                </div>
              </div>
            </div>

            {/* Live cost preview */}
            {estimatedCost && (
              <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">Estimated Cost Preview</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-[var(--muted-foreground)]">Base price</span>
                  <span className="text-[var(--foreground)] tabular-nums font-medium">{formatCurrency(estimatedCost.base)}/mo</span>
                  <span className="text-[var(--muted-foreground)]">Student cost</span>
                  <span className="text-[var(--foreground)] tabular-nums font-medium">
                    {estimatedCost.n} × {formatCurrency(estimatedCost.rate)} = {formatCurrency(estimatedCost.studentCost)}/mo
                  </span>
                  <span className="text-[var(--muted-foreground)] font-semibold">Total monthly</span>
                  <span className="text-[var(--primary)] tabular-nums font-bold">{formatCurrency(estimatedCost.monthly)}</span>
                  <span className="text-[var(--muted-foreground)] font-semibold">Total annual</span>
                  <span className="text-[var(--foreground)] tabular-nums font-semibold">{formatCurrency(estimatedCost.annual)}</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save Changes' : 'Add School'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Payment Alert Dialog ─────────────────────────────────────── */}
      <Dialog open={paymentMode === 'alert' && !!paymentTarget} onOpenChange={(o) => { if (!o) closePayment() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell size={18} className="text-amber-500" /> Send Payment Alert</DialogTitle>
            <DialogDescription>Send a payment reminder to the school admin.</DialogDescription>
          </DialogHeader>
          {!paymentSent ? (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">School</span>
                  <span className="font-medium text-[var(--foreground)]">{paymentTarget?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Admin email</span>
                  <span className="font-medium text-[var(--foreground)]">{paymentTarget?.admin_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Amount due</span>
                  <span className="font-bold text-amber-600">{formatCurrency(invoiceAmount)}/mo</span>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">An email notification will be sent to the school admin reminding them of the outstanding payment.</p>
              <DialogFooter>
                <Button variant="outline" onClick={closePayment}>Cancel</Button>
                <Button onClick={confirmSend} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Send size={14} /> Send Alert
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={36} className="text-green-500" />
              <p className="font-semibold text-[var(--foreground)]">Alert Sent!</p>
              <p className="text-sm text-[var(--muted-foreground)]">Payment reminder sent to {paymentTarget?.admin_email}.</p>
              <Button variant="outline" onClick={closePayment}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Invoice Dialog ───────────────────────────────────────────── */}
      <Dialog open={paymentMode === 'invoice' && !!paymentTarget} onOpenChange={(o) => { if (!o) closePayment() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText size={18} className="text-[var(--primary)]" /> Send Invoice</DialogTitle>
            <DialogDescription>Generate and send an invoice to the school admin.</DialogDescription>
          </DialogHeader>
          {!paymentSent ? (
            <>
              {/* Invoice preview */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--foreground)] text-base">INVOICE</span>
                  <span className="text-xs text-[var(--muted-foreground)]">#{new Date().getFullYear()}-{String(paymentTarget?.id).slice(-4).toUpperCase()}</span>
                </div>
                <div className="border-t border-[var(--border)] pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">To</span>
                    <span className="font-medium text-[var(--foreground)] truncate max-w-[160px] text-right">{paymentTarget?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Email</span>
                    <span className="text-[var(--foreground)] truncate max-w-[160px] text-right">{paymentTarget?.admin_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Plan</span>
                    <span className="text-[var(--foreground)]">{paymentTarget?.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Students</span>
                    <span className="text-[var(--foreground)] tabular-nums">{formatNumber(paymentTarget?.student_count ?? 0)}</span>
                  </div>
                </div>
                <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold">
                  <span className="text-[var(--foreground)]">Total Due</span>
                  <span className="text-[var(--primary)] text-base">{formatCurrency(invoiceAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">A PDF invoice will be generated and emailed to the school admin.</p>
              <DialogFooter>
                <Button variant="outline" onClick={closePayment}>Cancel</Button>
                <Button onClick={confirmSend}>
                  <Send size={14} /> Send Invoice
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={36} className="text-green-500" />
              <p className="font-semibold text-[var(--foreground)]">Invoice Sent!</p>
              <p className="text-sm text-[var(--muted-foreground)]">Invoice emailed to {paymentTarget?.admin_email}.</p>
              <Button variant="outline" onClick={closePayment}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Import Dialog ───────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Schools</DialogTitle>
            <DialogDescription>Upload a CSV to onboard many schools at once. Download the template to see the required columns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <button onClick={downloadTemplate} className="w-full flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-left hover:border-[var(--primary)]/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0"><FileSpreadsheet size={20} className="text-green-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">Download example template</p>
                <p className="text-xs text-[var(--muted-foreground)]">smarttrack_school_import_template.csv</p>
              </div>
              <Download size={18} className="text-[var(--muted-foreground)]" />
            </button>

            <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center">
              <Upload size={24} className="mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm text-[var(--foreground)] mb-3">Upload your filled CSV file</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Choose File</Button>
            </div>

            {importMsg && <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle size={15} /> {importMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
