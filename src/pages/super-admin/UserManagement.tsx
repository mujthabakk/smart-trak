import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserPlus, CheckCircle, Ban, MoreHorizontal, Pencil, Power, Send, KeyRound, Building2,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { formatDate, getInitials, generateId } from '@/lib/utils'
import { mockSchools } from '@/lib/mockData'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

interface SchoolAdmin {
  id: string
  name: string
  email: string
  school: string
  lastLogin: string
  status: 'active' | 'inactive'
}

const ADMIN_NAMES = ['Hassan Ahmed', 'Fatima Al Ali', 'Mohammed Saeed', 'Aisha Khan', 'Omar Yusuf', 'Layla Hassan', 'Yousef Ali', 'Mariam Said']
const LOGINS = ['2026-06-23T06:30:00Z', '2026-06-22T18:10:00Z', '2026-06-23T05:45:00Z', '2026-06-19T09:20:00Z', '2026-06-21T12:00:00Z', '2026-05-30T14:00:00Z']

const INITIAL_ADMINS: SchoolAdmin[] = mockSchools.map((s, i) => ({
  id: `sa-${s.id}`,
  name: ADMIN_NAMES[i % ADMIN_NAMES.length],
  email: s.admin_email ?? s.email ?? `admin@${s.name.toLowerCase().replace(/\s+/g, '')}.ae`,
  school: s.name,
  lastLogin: LOGINS[i % LOGINS.length],
  status: s.status === 'suspended' ? 'inactive' : 'active',
}))

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof Users; accent: string }) {
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

export default function UserManagement() {
  const [admins, setAdmins] = useState<SchoolAdmin[]>(INITIAL_ADMINS)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', school: mockSchools[0]?.name ?? '' })

  const counts = useMemo(() => ({
    total: admins.length,
    active: admins.filter((m) => m.status === 'active').length,
    inactive: admins.filter((m) => m.status === 'inactive').length,
  }), [admins])

  function toggleStatus(id: string) {
    setAdmins((prev) => prev.map((m) => m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m))
  }

  function addAdmin() {
    if (!form.name.trim() || !form.email.trim()) return
    setAdmins((prev) => [{ id: `sa-${generateId()}`, name: form.name, email: form.email, school: form.school, lastLogin: new Date().toISOString(), status: 'active' }, ...prev])
    setForm({ name: '', email: '', school: mockSchools[0]?.name ?? '' })
    setAddOpen(false)
  }

  const columns: Column<SchoolAdmin>[] = [
    {
      key: 'name', header: 'School Admin', sortable: true, accessor: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{row.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'school', header: 'School', sortable: true, accessor: (row) => row.school,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-[var(--foreground)]">
          <Building2 size={14} className="text-[var(--muted-foreground)]" /> {row.school}
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: () => <Badge variant="info">School Admin</Badge> },
    { key: 'lastLogin', header: 'Last Login', sortable: true, accessor: (row) => row.lastLogin, render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(row.lastLogin, 'relative')}</span> },
    {
      key: 'status', header: 'Status', sortable: true, accessor: (row) => row.status,
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch checked={row.status === 'active'} onCheckedChange={() => toggleStatus(row.id)} />
          <span className="text-xs text-[var(--muted-foreground)] capitalize">{row.status}</span>
        </div>
      ),
    },
    {
      key: 'actions', header: '', className: 'text-right w-12',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem><Pencil size={14} /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.alert(`A password reset link has been sent to ${row.email}`)}><KeyRound size={14} /> Reset Password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => toggleStatus(row.id)}><Power size={14} />{row.status === 'active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <PageHeader
        title="Users"
        subtitle="Manage school administrator accounts"
        actions={<Button onClick={() => setAddOpen(true)}><UserPlus size={16} /> Add School Admin</Button>}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat label="School Admins" value={counts.total} icon={Users} accent="bg-[var(--primary)]/10 text-[var(--primary)]" />
          <MiniStat label="Active" value={counts.active} icon={CheckCircle} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <MiniStat label="Inactive" value={counts.inactive} icon={Ban} accent="bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400" />
        </motion.div>

        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={admins}
            keyField="id"
            searchable
            searchKeys={['name', 'email', 'school']}
            searchPlaceholder="Search school admins…"
            emptyTitle="No school admins"
            emptyDescription="Add a school admin account to get started."
          />
        </motion.div>
      </motion.div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Admin</DialogTitle>
            <DialogDescription>Create a school administrator account. Credentials are emailed on creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input id="admin-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Hassan Ahmed" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@school.ae" />
            </div>
            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={form.school} onValueChange={(v) => setForm((f) => ({ ...f, school: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {mockSchools.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addAdmin}><Send size={14} /> Create & Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
