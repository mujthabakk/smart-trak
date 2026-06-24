import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, PackageSearch, PackageCheck, CheckCircle2,
  Bus as BusIcon, CalendarDays, ClipboardList, Eye, ImagePlus,
  User, MessageSquare,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { allLostFound, allBuses, allRoutes } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'
import type { LostFoundItem, LostFoundStatus } from '@/types'

const SCHOOL_ID = 'sch_001'

const GRADIENTS = [
  'from-violet-500/20 to-fuchsia-500/10',
  'from-blue-500/20 to-cyan-500/10',
  'from-amber-500/20 to-orange-500/10',
  'from-emerald-500/20 to-teal-500/10',
  'from-rose-500/20 to-pink-500/10',
  'from-indigo-500/20 to-sky-500/10',
]

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function ItemCard({ entry, index, onAction, onViewClaims }: {
  entry: LostFoundItem
  index: number
  onAction: (id: string) => void
  onViewClaims: (entry: LostFoundItem) => void
}) {
  const title = entry.description.split(/[,.]/)[0].trim()
  return (
    <motion.div
      variants={item}
      layout
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image area — real photo if available, else gradient placeholder */}
      <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]}`}>
        {entry.image_url ? (
          <img
            src={entry.image_url}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package size={44} className="text-[var(--foreground)]/30" strokeWidth={1.5} />
        )}
        <div className="absolute right-3 top-3">
          <StatusBadge status={entry.status} size="sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {entry.description}
        </p>

        <div className="mt-3 space-y-1.5 text-xs text-[var(--muted-foreground)]">
          <p className="flex items-center gap-1.5">
            <BusIcon size={13} className="text-[var(--primary)]" />
            Found on {entry.bus_number} · {entry.driver_name}
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-[var(--primary)]" />
            {formatDate(entry.reported_at, 'datetime')}
          </p>
        </div>

        <div className="mt-auto pt-4">
          {entry.status === 'reported' ? (
            <Button size="sm" className="w-full" onClick={() => onAction(entry.id)}>
              <PackageCheck size={14} /> Mark Claimed
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onViewClaims(entry)}>
              <Eye size={14} /> View Claims
              {entry.claims.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--primary)]/10 px-1.5 text-[10px] font-semibold text-[var(--primary)]">
                  {entry.claims.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function LostFound() {
  const buses = useMemo(() => allBuses.filter((b) => b.school_id === SCHOOL_ID), [])
  const routes = useMemo(() => allRoutes.filter((r) => r.school_id === SCHOOL_ID), [])

  const [items, setItems] = useState<LostFoundItem[]>(() =>
    allLostFound.filter((l) => l.school_id === SCHOOL_ID),
  )
  const [tab, setTab] = useState<LostFoundStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewingClaims, setViewingClaims] = useState<LostFoundItem | null>(null)

  // Report form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setFormImageUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const stats = useMemo(() => ({
    reported: items.filter((i) => i.status === 'reported').length,
    claimed: items.filter((i) => i.status === 'claimed').length,
    returned: items.filter((i) => i.status === 'resolved').length,
  }), [items])

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    return items.filter((i) => i.status === tab)
  }, [items, tab])

  function markClaimed(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'claimed' } : i)))
  }

  function resetForm() {
    setFormName('')
    setFormDesc('')
    setFormLocation('')
    setFormDate('')
    setFormImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function submitReport() {
    if (!formName || !formLocation) return
    const bus = buses.find((b) => b.id === formLocation)
    const route = routes.find((r) => r.id === formLocation)
    const newItem: LostFoundItem = {
      id: `lf_${Date.now()}`,
      school_id: SCHOOL_ID,
      bus_id: bus?.id ?? route?.bus_id ?? '',
      bus_number: bus?.bus_number ?? route?.bus_number ?? route?.name ?? '—',
      driver_id: bus?.driver_id ?? route?.driver_id ?? '',
      driver_name: bus?.driver_name ?? route?.driver_name ?? 'Unassigned',
      description: formDesc ? `${formName}. ${formDesc}` : formName,
      reported_at: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
      status: 'reported',
      claims: [],
      ...(formImageUrl ? { image_url: formImageUrl } : {}),
    }
    setItems((prev) => [newItem, ...prev])
    resetForm()
    setDialogOpen(false)
  }

  const TABS: Array<{ value: LostFoundStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'reported', label: 'Reported' },
    { value: 'claimed', label: 'Claimed' },
  ]

  return (
    <Layout>
      <PageHeader
        title="Lost & Found"
        subtitle="Items found on buses and their claims"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Report Item
          </Button>
        }
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard title="Reported" value={stats.reported} icon={PackageSearch} color="warning" subtitle="awaiting claim" />
          <StatsCard title="Claimed" value={stats.claimed} icon={PackageCheck} color="info" />
          <StatsCard title="Returned" value={stats.returned} icon={CheckCircle2} color="success" />
        </motion.div>

        <motion.div variants={item}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as LostFoundStatus | 'all')}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        <motion.div variants={item}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={Package}
                title="No items here"
                description="There are no lost & found items matching this filter. Report a found item to get started."
                action={
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus size={16} /> Report Item
                  </Button>
                }
              />
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence>
                {filtered.map((entry, i) => (
                  <ItemCard key={entry.id} entry={entry} index={i} onAction={markClaimed} onViewClaims={setViewingClaims} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* View Claims dialog */}
      <Dialog open={!!viewingClaims} onOpenChange={(open) => { if (!open) setViewingClaims(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={18} className="text-[var(--primary)]" />
              Claims
            </DialogTitle>
            <DialogDescription>
              {viewingClaims
                ? `"${viewingClaims.description.split(/[,.]/)[0].trim()}" — ${viewingClaims.claims.length} claim${viewingClaims.claims.length !== 1 ? 's' : ''}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto py-1">
            {viewingClaims && viewingClaims.claims.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-[var(--muted-foreground)]">
                <MessageSquare size={32} className="opacity-30" />
                <p>No claims have been submitted for this item yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {viewingClaims?.claims.map((claim) => (
                  <li
                    key={claim.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User size={14} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)]">{claim.student_name}</span>
                      </div>
                      <StatusBadge status={claim.status} size="sm" />
                    </div>
                    {claim.claim_note && (
                      <p className="mt-2 pl-5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                        {claim.claim_note}
                      </p>
                    )}
                    {claim.claimed_at && (
                      <p className="mt-1.5 pl-5 text-[11px] text-[var(--muted-foreground)]/70">
                        {formatDate(claim.claimed_at, 'datetime')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report item dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={18} className="text-[var(--primary)]" /> Report Found Item
            </DialogTitle>
            <DialogDescription>Log an item found on one of your buses or routes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="lf-name">Item Name</Label>
              <Input
                id="lf-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Blue school bag"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lf-desc">Description</Label>
              <Textarea
                id="lf-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Colour, contents, where it was found…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Photo (optional)</Label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-4 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/50"
                onClick={() => fileInputRef.current?.click()}
              >
                {formImageUrl ? (
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="max-h-32 max-w-full rounded-md object-contain"
                  />
                ) : (
                  <>
                    <ImagePlus size={24} className="text-[var(--muted-foreground)]" />
                    <span className="text-xs text-[var(--muted-foreground)]">Click to upload an image</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="lf-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lf-location">Found Location</Label>
                <Select value={formLocation} onValueChange={setFormLocation}>
                  <SelectTrigger id="lf-location">
                    <SelectValue placeholder="Select bus / route" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bus {b.bus_number}
                      </SelectItem>
                    ))}
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-date">Date Found</Label>
                <input
                  id="lf-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitReport} disabled={!formName || !formLocation}>
              Report Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
