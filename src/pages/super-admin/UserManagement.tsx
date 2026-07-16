import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Users, UserPlus, CalendarCheck, MoreHorizontal, Pencil, Trash2, KeyRound, Building2, AlertCircle, RefreshCw,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { formatDate, getInitials } from '@/lib/utils'
import { listUsers, createUser, updateUser, deleteUser } from '@/lib/api/users'
import { listSchools } from '@/lib/api/schools'
import type { User as AuthUser } from '@/store/authStore'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// The users API is typed against the auth store's leaner `User` shape, but the
// backend actually returns `created_at`/`last_login` for every account (see
// backend/src/modules/users/users.service.js). Extend locally rather than
// touching src/lib/api/users.ts.
interface AdminUser extends AuthUser {
  created_at?: string
  last_login?: string
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

function generateTempPassword(): string {
  const rand = Math.random().toString(36).slice(-6)
  return `Temp${rand}!9`
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl text-sm"
      style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {message}
    </div>
  )
}

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

interface AdminForm {
  name: string
  email: string
  password: string
  school_id: string
}

const emptyForm: AdminForm = { name: '', email: '', password: '', school_id: '' }

export default function UserManagement() {
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<AdminForm>(emptyForm)
  const [editForm, setEditForm] = useState<AdminForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'school_admin'],
    queryFn: async () => (await listUsers({ role: 'school_admin', pageSize: 100 })) as unknown as { users: AdminUser[] },
  })
  const admins = useMemo(() => data?.users ?? [], [data])

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', 'picker'],
    queryFn: () => listSchools({ pageSize: 100 }),
  })
  const schools = schoolsData?.schools ?? []

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setAddOpen(false)
      setForm(emptyForm)
      setFormError('')
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AuthUser> & { password?: string } }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditOpen(false)
      setEditTarget(null)
      setEditError('')
    },
    onError: (err) => setEditError(extractErrorMessage(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => updateUser(id, { password }),
    onSuccess: (_user, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      window.alert(`Password reset. New temporary password: ${variables.password}`)
    },
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const counts = useMemo(() => {
    const total = admins.length
    const schoolsCovered = new Set(admins.map((a) => a.school_id).filter(Boolean)).size
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const activeThisWeek = admins.filter((a) => a.last_login && new Date(a.last_login).getTime() >= weekAgo).length
    return { total, schoolsCovered, activeThisWeek }
  }, [admins])

  function openAdd() {
    setForm({ ...emptyForm, password: generateTempPassword(), school_id: schools[0]?.id ?? '' })
    setFormError('')
    setAddOpen(true)
  }

  function submitAdd() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.school_id) {
      setFormError('Please fill in name, email, password, and select a school.')
      return
    }
    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: 'school_admin',
      school_id: form.school_id,
    })
  }

  function openEdit(admin: AdminUser) {
    setEditTarget(admin)
    setEditForm({ name: admin.name, email: admin.email, password: '', school_id: admin.school_id ?? '' })
    setEditError('')
    setEditOpen(true)
  }

  function saveEdit() {
    if (!editTarget || !editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Name and email are required.')
      return
    }
    updateMutation.mutate({
      id: editTarget.id,
      payload: { name: editForm.name.trim(), email: editForm.email.trim(), school_id: editForm.school_id || undefined },
    })
  }

  function resetPassword(admin: AdminUser) {
    if (!window.confirm(`Reset password for ${admin.name}?`)) return
    resetPasswordMutation.mutate({ id: admin.id, password: generateTempPassword() })
  }

  function removeAdmin(admin: AdminUser) {
    if (!window.confirm(`Delete ${admin.name}'s account? This cannot be undone.`)) return
    deleteMutation.mutate(admin.id)
  }

  const columns: Column<AdminUser>[] = [
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
      key: 'school_name', header: 'School', sortable: true, accessor: (row) => row.school_name ?? '',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-[var(--foreground)]">
          <Building2 size={14} className="text-[var(--muted-foreground)]" /> {row.school_name ?? '—'}
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: () => <Badge variant="info">School Admin</Badge> },
    {
      key: 'last_login', header: 'Last Login', sortable: true, accessor: (row) => row.last_login ?? '',
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{row.last_login ? formatDate(row.last_login, 'relative') : 'Never'}</span>,
    },
    {
      key: 'created_at', header: 'Created', sortable: true, accessor: (row) => row.created_at ?? '',
      render: (row) => <span className="text-[var(--muted-foreground)] whitespace-nowrap">{row.created_at ? formatDate(row.created_at) : '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right w-12',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEdit(row)}><Pencil size={14} /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetPassword(row)}><KeyRound size={14} /> Reset Password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => removeAdmin(row)}><Trash2 size={14} /> Delete</DropdownMenuItem>
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
        actions={<Button onClick={openAdd}><UserPlus size={16} /> Add School Admin</Button>}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat label="School Admins" value={counts.total} icon={Users} accent="bg-[var(--primary)]/10 text-[var(--primary)]" />
          <MiniStat label="Schools Covered" value={counts.schoolsCovered} icon={Building2} accent="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <MiniStat label="Active This Week" value={counts.activeThisWeek} icon={CalendarCheck} accent="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        </motion.div>

        {isError && <ErrorBanner message="Failed to load school admins. Please try again." />}

        {isLoading ? (
          <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : (
          <motion.div variants={item}>
            <DataTable
              columns={columns}
              data={admins}
              keyField="id"
              searchable
              searchKeys={['name', 'email', 'school_name']}
              searchPlaceholder="Search school admins…"
              emptyTitle="No school admins"
              emptyDescription="Add a school admin account to get started."
            />
          </motion.div>
        )}
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Admin</DialogTitle>
            <DialogDescription>Create a school administrator account. Share the temporary password with them securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formError && <ErrorBanner message={formError} />}
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input id="admin-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Hassan Ahmed" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@school.ae" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Temporary Password</Label>
              <div className="flex gap-2">
                <Input id="admin-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Temp password" />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, password: generateTempPassword() }))} title="Generate new password">
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={form.school_id} onValueChange={(v) => setForm((f) => ({ ...f, school_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} loading={createMutation.isPending}><UserPlus size={14} /> Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School Admin</DialogTitle>
            <DialogDescription>Update this administrator's name, email, or school assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && <ErrorBanner message={editError} />}
            <div className="space-y-1.5">
              <Label htmlFor="edit-admin-name">Full Name</Label>
              <Input
                id="edit-admin-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Hassan Ahmed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-admin-email">Email</Label>
              <Input
                id="edit-admin-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@school.ae"
              />
            </div>
            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={editForm.school_id} onValueChange={(v) => setEditForm((f) => ({ ...f, school_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} loading={updateMutation.isPending}><Pencil size={14} /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
