import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Plus, Play, Pencil, Trash2, Clock, Eye, BookOpen, X, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
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
import { listTraining, createTrainingModule, updateTrainingModule, deleteTrainingModule } from '@/lib/api/training'
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

interface ModuleForm {
  title: string
  description: string
  video_url: string
  thumbnail_url: string
}

const emptyModuleForm: ModuleForm = { title: '', description: '', video_url: '', thumbnail_url: '' }

function getEmbedUrl(url: string): string {
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return url
}

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

export default function Training() {
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<FilterTab>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingModule | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModuleForm)
  const [formRole, setFormRole] = useState<UserRole>('school_admin')
  const [formPublished, setFormPublished] = useState(true)
  const [formError, setFormError] = useState('')
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerModule, setPlayerModule] = useState<TrainingModule | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['training'],
    queryFn: () => listTraining({ pageSize: 200 }),
  })
  const modules = data?.trainingModules ?? []

  const filtered = useMemo(
    () => (tab === 'all' ? modules : modules.filter((m) => m.target_role === tab)),
    [modules, tab],
  )

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<TrainingModule>) =>
      editing ? updateTrainingModule(editing.id, payload) : createTrainingModule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] })
      setDialogOpen(false)
      setFormError('')
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) => updateTrainingModule(id, { is_published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTrainingModule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training'] }),
  })

  function togglePublished(m: TrainingModule) {
    toggleMutation.mutate({ id: m.id, is_published: !m.is_published })
  }

  function removeModule(id: string) {
    if (!window.confirm('Delete this training module? This cannot be undone.')) return
    deleteMutation.mutate(id)
  }

  function openAdd() {
    setEditing(null)
    setModuleForm(emptyModuleForm)
    setFormRole('school_admin')
    setFormPublished(true)
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(m: TrainingModule) {
    setEditing(m)
    setModuleForm({
      title: m.title,
      description: m.description,
      video_url: m.video_url,
      thumbnail_url: m.thumbnail_url ?? '',
    })
    setFormRole(m.target_role)
    setFormPublished(m.is_published)
    setFormError('')
    setDialogOpen(true)
  }

  function openPlayer(m: TrainingModule) {
    setPlayerModule(m)
    setPlayerOpen(true)
  }

  function saveModule() {
    if (!moduleForm.title.trim() || !moduleForm.video_url.trim()) {
      setFormError('Title and video URL are required.')
      return
    }
    saveMutation.mutate({
      title: moduleForm.title.trim(),
      description: moduleForm.description.trim(),
      video_url: moduleForm.video_url.trim(),
      thumbnail_url: moduleForm.thumbnail_url.trim() || undefined,
      target_role: formRole,
      is_published: formPublished,
    })
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

        {isError && (
          <motion.div variants={item}>
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load training modules. Please try again.
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
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
                {/* Thumbnail / play area */}
                <div
                  className={`relative aspect-video bg-gradient-to-br ${ROLE_GRADIENT[m.target_role] ?? 'from-slate-500 to-slate-700'} flex items-center justify-center cursor-pointer`}
                  onClick={() => openPlayer(m)}
                >
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
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
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
                      <Switch checked={m.is_published} onCheckedChange={() => togglePublished(m)} />
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {m.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs" onClick={() => openPlayer(m)}>
                        <Play size={13} className="fill-current" /> Watch
                      </Button>
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

      {/* Video Player Dialog */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0 pr-4">
              <h2 className="font-semibold text-[var(--foreground)] truncate">{playerModule?.title}</h2>
              <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{playerModule?.description}</p>
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setPlayerOpen(false)}>
              <X size={16} />
            </Button>
          </div>
          <div className="aspect-video w-full bg-black">
            {playerModule?.video_url && (
              <iframe
                src={getEmbedUrl(playerModule.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={playerModule.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Module Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Module' : 'Add Module'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this training module.' : 'Create a new training video module.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="mod-title">Title</Label>
              <Input id="mod-title" value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} placeholder="Module title" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-desc">Description</Label>
              <Textarea id="mod-desc" value={moduleForm.description} onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" rows={3} />
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
                <Input id="mod-video" value={moduleForm.video_url} onChange={(e) => setModuleForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-thumb">Thumbnail URL</Label>
                <Input id="mod-thumb" value={moduleForm.thumbnail_url} onChange={(e) => setModuleForm((f) => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://…" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5">
              <span className="text-sm text-[var(--foreground)]">Published</span>
              <Switch checked={formPublished} onCheckedChange={setFormPublished} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveModule} loading={saveMutation.isPending}>Save Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
