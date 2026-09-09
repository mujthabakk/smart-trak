import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ScrollText, User, Building2, Bus, Route as RouteIcon, GraduationCap,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useAppSelector } from '@/store/hooks'
import { listAuditLogs, humanizeAuditAction, type AuditLog } from '@/lib/api/auditLogs'
import { listSchools } from '@/lib/api/schools'
import { formatDate, cn } from '@/lib/utils'

const ENTITY_ICON: Record<string, typeof User> = {
  student: GraduationCap,
  bus: Bus,
  driver: User,
  route: RouteIcon,
  school: Building2,
}

const ENTITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'student', label: 'Students' },
  { value: 'bus', label: 'Buses' },
  { value: 'driver', label: 'Drivers' },
  { value: 'route', label: 'Routes' },
  { value: 'school', label: 'Schools' },
]

export default function AuditLogs() {
  const role = useAppSelector((s) => s.auth.role)
  const isSuperAdmin = role === 'super_admin'
  const [entityFilter, setEntityFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', schoolFilter],
    queryFn: () => listAuditLogs({ pageSize: 100, school_id: schoolFilter || undefined }),
  })
  const logs = data?.logs ?? []
  const filteredLogs = entityFilter === 'all' ? logs : logs.filter((l) => l.entity_type === entityFilter)

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', 'for-audit-filter'],
    queryFn: () => listSchools({ pageSize: 1000 }),
    enabled: isSuperAdmin,
  })
  const schools = schoolsData?.schools ?? []

  const columns: Column<AuditLog>[] = [
    {
      key: 'action', header: 'Action',
      render: (l) => {
        const Icon = ENTITY_ICON[l.entity_type] ?? ScrollText
        const detailName = l.details && typeof l.details.name === 'string' ? l.details.name : undefined
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-[var(--muted-foreground)]" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)] truncate">{humanizeAuditAction(l.action)}</p>
              {detailName && <p className="text-xs text-[var(--muted-foreground)] truncate">{detailName}</p>}
            </div>
          </div>
        )
      },
    },
    { key: 'user_name', header: 'By', render: (l) => <span className="text-sm text-[var(--foreground)]">{l.user_name ?? 'System'}</span> },
    ...(isSuperAdmin ? [{
      key: 'school_name', header: 'School',
      render: (l) => <span className="text-sm text-[var(--muted-foreground)]">{l.school_name ?? '—'}</span>,
    } as Column<AuditLog>] : []),
    { key: 'entity_type', header: 'Type', render: (l) => <Badge variant="secondary" className="capitalize">{l.entity_type}</Badge> },
    { key: 'created_at', header: 'When', render: (l) => <span className="tabular-nums text-sm">{formatDate(l.created_at, 'datetime')}</span> },
  ]

  return (
    <Layout>
      <PageHeader
        title="Audit Logs"
        subtitle="A trail of every tracked change — who did what, and when"
      />

      {isError && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          Failed to load audit logs. Please try again.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setEntityFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              entityFilter === f.value
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
            )}
          >
            {f.label}
          </button>
        ))}
        {isSuperAdmin && (
          <Select value={schoolFilter || 'all'} onValueChange={(v) => setSchoolFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-56 ml-auto"><SelectValue placeholder="All schools" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schools</SelectItem>
              {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          keyField="id"
          onRowClick={setSelected}
          searchable
          searchKeys={['action', 'user_name', 'entity_type']}
          searchPlaceholder="Search by action or user..."
          emptyTitle="No changes logged yet"
          emptyDescription="Actions like adding a student, bus, driver, or route will show up here."
        />
      )}

      {/* Detail dialog */}
      <Dialog open={selected !== null} onOpenChange={(v) => { if (!v) setSelected(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText size={16} /> {selected && humanizeAuditAction(selected.action)}
            </DialogTitle>
            <DialogDescription>
              {selected?.user_name ?? 'System'} &middot; {selected && formatDate(selected.created_at, 'datetime')}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Entity type</span>
                <span className="font-medium text-[var(--foreground)] capitalize">{selected.entity_type}</span>
              </div>
              {selected.entity_id && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Entity ID</span>
                  <span className="font-medium text-[var(--foreground)]">{selected.entity_id}</span>
                </div>
              )}
              {selected.school_name && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">School</span>
                  <span className="font-medium text-[var(--foreground)]">{selected.school_name}</span>
                </div>
              )}
              {selected.details && Object.keys(selected.details).length > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">Details</p>
                  <pre className="text-xs text-[var(--foreground)] whitespace-pre-wrap break-words">{JSON.stringify(selected.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
