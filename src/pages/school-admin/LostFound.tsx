import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Package, Plus, PackageSearch, PackageCheck, CheckCircle2,
  Bus as BusIcon, CalendarDays, ClipboardList, Eye, ImagePlus,
  User, MessageSquare, AlertCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
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
import { Card, CardContent } from '@/components/ui/card'
import {
  listLostFound, reportLostFoundItem, updateLostFoundItem,
  claimLostFoundItem, updateLostFoundClaim,
} from '@/lib/api/lostFound'
import { listBuses } from '@/lib/api/buses'
import { listDrivers } from '@/lib/api/drivers'
import { listStudents } from '@/lib/api/students'
import { formatDate } from '@/lib/utils'
import type { LostFoundItem, LostFoundStatus } from '@/types'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GRADIENTS = [
  'from-violet-500/20 to-fuchsia-500/10',
  'from-blue-500/20 to-cyan-500/10',
  'from-amber-500/20 to-orange-500/10',
  'from-emerald-500/20 to-teal-500/10',
  'from-rose-500/20 to-pink-500/10',
  'from-indigo-500/20 to-sky-500/10',
]

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
      style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {message}
    </div>
  )
}

function ItemCard({ entry, index, onClaim, onViewClaims }: {
  entry: LostFoundItem
  index: number
  onClaim: (id: string) => void
  onViewClaims: (id: string) => void
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
            <Button size="sm" className="w-full" onClick={() => onClaim(entry.id)}>
              <PackageCheck size={14} /> Mark Claimed
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onViewClaims(entry.id)}>
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
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lost-found'],
    queryFn: () => listLostFound(),
  })
  const items = useMemo(() => data?.items ?? [], [data])

  const { data: busesData } = useQuery({
    queryKey: ['buses'],
    queryFn: () => listBuses(),
  })
  const buses = useMemo(() => busesData?.buses ?? [], [busesData])

  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => listDrivers(),
  })
  const drivers = useMemo(() => driversData?.drivers ?? [], [driversData])

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => listStudents({ pageSize: 1000 }),
  })
  const students = useMemo(() => studentsData?.students ?? [], [studentsData])

  const [tab, setTab] = useState<LostFoundStatus | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewingClaimsId, setViewingClaimsId] = useState<string | null>(null)
  const viewingClaims = useMemo(
    () => items.find((i) => i.id === viewingClaimsId) ?? null,
    [items, viewingClaimsId],
  )

  // Claim dialog state
  const [claimTargetId, setClaimTargetId] = useState<string | null>(null)
  const claimTarget = useMemo(
    () => items.find((i) => i.id === claimTargetId) ?? null,
    [items, claimTargetId],
  )
  const [claimStudentId, setClaimStudentId] = useState('')
  const [claimNote, setClaimNote] = useState('')

  // Report form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBusId, setFormBusId] = useState('')
  const [formDriverId, setFormDriverId] = useState('')
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

  const reportMutation = useMutation({
    mutationFn: reportLostFoundItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] })
      resetForm()
      setDialogOpen(false)
    },
  })

  const claimMutation = useMutation({
    mutationFn: ({ id, student_id, claim_note }: { id: string; student_id: string; claim_note?: string }) =>
      claimLostFoundItem(id, { student_id, claim_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] })
      setClaimTargetId(null)
      setClaimStudentId('')
      setClaimNote('')
    },
  })

  const resolveClaimMutation = useMutation({
    mutationFn: ({ id, claimId }: { id: string; claimId: string }) =>
      updateLostFoundClaim(id, claimId, { status: 'resolved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-found'] })
    },
  })

  function resetForm() {
    setFormName('')
    setFormDesc('')
    setFormBusId('')
    setFormDriverId('')
    setFormImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function submitReport() {
    if (!formName || !formBusId || !formDriverId) return
    const description = formDesc ? `${formName}. ${formDesc}` : formName
    reportMutation.mutate({
      bus_id: formBusId,
      driver_id: formDriverId,
      description,
      ...(formImageUrl ? { image_url: formImageUrl } : {}),
    })
  }

  function submitClaim() {
    if (!claimTarget || !claimStudentId) return
    claimMutation.mutate({ id: claimTarget.id, student_id: claimStudentId, claim_note: claimNote || undefined })
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
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-4 pb-3">
              <HorizontalCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </CardContent>
          </Card>
        </motion.div>

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
          {isError && <ErrorBanner message="Failed to load lost & found items. Please try again." />}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
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
                  <ItemCard key={entry.id} entry={entry} index={i} onClaim={setClaimTargetId} onViewClaims={setViewingClaimsId} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* View Claims dialog */}
      <Dialog open={!!viewingClaims} onOpenChange={(open) => { if (!open) setViewingClaimsId(null) }}>
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
                    {claim.status === 'pending' && (
                      <div className="mt-2 pl-5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolveClaimMutation.isPending}
                          onClick={() => viewingClaims && resolveClaimMutation.mutate({ id: viewingClaims.id, claimId: claim.id })}
                        >
                          Mark Resolved
                        </Button>
                      </div>
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

      {/* Claim item dialog */}
      <Dialog open={!!claimTarget} onOpenChange={(open) => { if (!open) { setClaimTargetId(null); setClaimStudentId(''); setClaimNote('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck size={18} className="text-[var(--primary)]" /> Claim Item
            </DialogTitle>
            <DialogDescription>
              {claimTarget ? `Record a claim for "${claimTarget.description.split(/[,.]/)[0].trim()}".` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {claimMutation.isError && <ErrorBanner message="Failed to record the claim. Please try again." />}
            <div className="space-y-1.5">
              <Label htmlFor="lf-claim-student">Student</Label>
              <Select value={claimStudentId} onValueChange={setClaimStudentId}>
                <SelectTrigger id="lf-claim-student">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · Class {s.class}{s.division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lf-claim-note">Note (optional)</Label>
              <Textarea
                id="lf-claim-note"
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Any identifying detail provided by the student…"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitClaim} disabled={!claimStudentId} loading={claimMutation.isPending}>
              Submit Claim
            </Button>
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
            <DialogDescription>Log an item found on one of your buses.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {reportMutation.isError && <ErrorBanner message="Failed to report this item. Please try again." />}
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
                <Label htmlFor="lf-bus">Found on Bus</Label>
                <Select value={formBusId} onValueChange={setFormBusId}>
                  <SelectTrigger id="lf-bus">
                    <SelectValue placeholder="Select bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bus {b.bus_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-driver">Driver</Label>
                <Select value={formDriverId} onValueChange={setFormDriverId}>
                  <SelectTrigger id="lf-driver">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submitReport} disabled={!formName || !formBusId || !formDriverId} loading={reportMutation.isPending}>
              Report Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
