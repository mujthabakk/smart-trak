import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Play, Pencil, Trash2, Clock, Eye, BookOpen,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formatNumber, getRoleLabel } from '@/lib/utils'
import { mockTrainingModules } from '@/lib/mockData'
import type { TrainingModule, UserRole } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const ROLE_VARIANT: Record<string, 'secondary' | 'info' | 'warning' | 'muted'> = {
  school_admin: 'secondary',
  driver: 'info',
  parent: 'warning',
}

const ROLE_GRADIENT: Record<string, string> = {
  school_admin: 'from-violet-500 to-purple-600',
  driver: 'from-blue-500 to-cyan-500',
  parent: 'from-amber-500 to-orange-500',
}

const TARGET_ROLES: UserRole[] = ['school_admin', 'driver', 'parent']

type FilterTab = 'all' | UserRole

export default function Training() {
  const [modules, setModules] = useState<TrainingModule[]>(mockTrainingModules)
  const [tab, setTab] = useState<FilterTab>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingModule | null>(null)
  const [formRole, setFormRole] = useState<UserRole>('school_admin')
  const [formPublished, setFormPublished] = useState(true)

  const filtered = useMemo(
    () => (tab === 'all' ? modules : modules.filter((m) => m.target_role === tab)),
    [modules, tab],
  )

  function togglePublished(id: string) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_published: !m.is_published } : m)),
    )
  }

  function removeModule(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id))
  }

  function openAdd() {
    setEditing(null)
    setFormRole('school_admin')
    setFormPublished(true)
    setDialogOpen(true)
  }

  function openEdit(m: TrainingModule) {
    setEditing(m)
    setFormRole(m.target_role)
    setFormPublished(m.is_published)
    setDialogOpen(true)
  }

  return (
    <Layout>
      <PageHeader
        title="Training Centre"
        subtitle="Manage video tutorials and resources by role"
        actions={
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Module
          </Button>
        }
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="school_admin">School Admin</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div variants={item}>
            <EmptyState
              icon={BookOpen}
              title="No modules found"
              description="There are no training modules for this role yet. Add one to get started."
              action={<Button onClick={openAdd}><Plus size={16} /> Add Module</Button>}
            />
          </motion.div>
        ) : (
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((m) => (
              <motion.div
                key={m.id}
                variants={item}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Thumbnail */}
                <div className={`relative aspect-video bg-gradient-to-br ${ROLE_GRADIENT[m.target_role] ?? 'from-slate-500 to-slate-700'} flex items-center justify-center`}>
                  <div className="h-14 w-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white fill-white ml-0.5" />
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant={m.is_published ? 'success' : 'muted'}>
                      {m.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  {m.duration_mins !== undefined && (
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                      {m.duration_mins} min
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--foreground)] leading-snug">{m.title}</h3>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-2 mb-3">{m.description}</p>

                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] mb-3">
                    <Badge variant={ROLE_VARIANT[m.target_role] ?? 'muted'}>{getRoleLabel(m.target_role)}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={13} /> {formatNumber(m.view_count)}
                    </span>
                    {m.duration_mins !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} /> {m.duration_mins}m
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <Switch checked={m.is_published} onCheckedChange={() => togglePublished(m.id)} />
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {m.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeModule(m.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Module' : 'Add Module'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this training module.' : 'Create a new training video module.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod-title">Title</Label>
              <Input id="mod-title" defaultValue={editing?.title ?? ''} placeholder="Module title" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-desc">Description</Label>
              <Textarea id="mod-desc" defaultValue={editing?.description ?? ''} placeholder="Short description" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mod-video">Video URL</Label>
                <Input id="mod-video" defaultValue={editing?.video_url ?? ''} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-thumb">Thumbnail URL</Label>
                <Input id="mod-thumb" defaultValue={editing?.thumbnail_url ?? ''} placeholder="https://…" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
              <span className="text-sm text-[var(--foreground)]">Published</span>
              <Switch checked={formPublished} onCheckedChange={setFormPublished} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)}>Save Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
