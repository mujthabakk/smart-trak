import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Plus, Pencil, Trash2, Sparkles, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  listFeatureCatalog, createFeatureCatalogItem, updateFeatureCatalogItem, deleteFeatureCatalogItem,
} from '@/lib/api/featureCatalog'
import type { FeatureCatalogItem } from '@/types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || fallback
  }
  return fallback
}

export default function Features() {
  const queryClient = useQueryClient()

  const { data: features = [], isLoading, isError } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: listFeatureCatalog,
  })

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')

  const [editTarget, setEditTarget] = useState<FeatureCatalogItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<FeatureCatalogItem | null>(null)

  const createMutation = useMutation({
    mutationFn: (name: string) => createFeatureCatalogItem(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      setAddOpen(false)
      setAddName('')
      setAddError('')
    },
    onError: (err) => setAddError(extractErrorMessage(err, 'Failed to add feature.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateFeatureCatalogItem(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      setEditTarget(null)
      setEditError('')
    },
    onError: (err) => setEditError(extractErrorMessage(err, 'Failed to rename feature.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeatureCatalogItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    setAddName('')
    setAddError('')
    setAddOpen(true)
  }

  function submitAdd() {
    if (!addName.trim()) return
    createMutation.mutate(addName.trim())
  }

  function openEdit(f: FeatureCatalogItem) {
    setEditTarget(f)
    setEditName(f.name)
    setEditError('')
  }

  function submitEdit() {
    if (!editTarget || !editName.trim()) return
    updateMutation.mutate({ id: editTarget.id, name: editName.trim() })
  }

  return (
    <Layout>
      <PageHeader
        title="Plan Features"
        subtitle="Manage the catalog of features available when building subscription plans"
        actions={
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Feature
          </Button>
        }
      />

      {isError && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> Failed to load features. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : features.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No features yet"
          description="Add features here so they're available to enable (with a price) while creating a subscription plan."
          action={<Button onClick={openAdd}><Plus size={16} /> Add Feature</Button>}
        />
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <motion.div key={f.id} variants={item}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2 p-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={15} className="text-[var(--primary)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{f.name}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(f)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Feature Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Feature</DialogTitle>
            <DialogDescription>Add a new feature to the catalog. You'll set its price separately for each plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="feature-name">Feature Name</Label>
            <Input id="feature-name" placeholder="e.g. Real-time GPS Tracking" value={addName} onChange={(e) => setAddName(e.target.value)} />
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={!addName.trim()} loading={createMutation.isPending}>Add Feature</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Feature</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="edit-feature-name">Feature Name</Label>
            <Input id="edit-feature-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={!editName.trim()} loading={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              Remove "{deleteTarget?.name}" from the catalog? Plans that already have this feature enabled keep it — this only affects new selections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending}>
              <Trash2 size={14} /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
