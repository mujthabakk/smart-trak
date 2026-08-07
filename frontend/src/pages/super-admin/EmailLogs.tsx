import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, CheckCircle2, XCircle, FileWarning } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { listEmailLogs } from '@/lib/api/emailLogs'
import { formatDate } from '@/lib/utils'
import type { EmailLog } from '@/types'

const STATUS_META: Record<EmailLog['status'], { label: string; variant: 'success' | 'destructive' | 'warning'; icon: typeof CheckCircle2 }> = {
  sent: { label: 'Sent', variant: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  logged_only: { label: 'Logged only (SMTP not configured)', variant: 'warning', icon: FileWarning },
}

const TRIGGER_LABEL: Record<string, string> = {
  school_approval: 'School Approval',
  manual_regenerate: 'Manual Regenerate',
}

export default function EmailLogs() {
  const [selected, setSelected] = useState<EmailLog | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => listEmailLogs({ pageSize: 100 }),
  })
  const logs = data?.emailLogs ?? []

  const columns: Column<EmailLog>[] = [
    {
      key: 'recipient_email', header: 'Recipient',
      render: (l) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--foreground)] truncate">{l.recipient_email}</p>
          {l.school_name && <p className="text-xs text-[var(--muted-foreground)] truncate">{l.school_name}</p>}
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', render: (l) => <span className="truncate block max-w-xs">{l.subject}</span> },
    {
      key: 'trigger_type', header: 'Trigger',
      render: (l) => <Badge variant="secondary">{TRIGGER_LABEL[l.trigger_type] ?? l.trigger_type}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: (l) => {
        const meta = STATUS_META[l.status]
        const Icon = meta.icon
        return (
          <Badge variant={meta.variant} className="gap-1">
            <Icon size={12} /> {meta.label}
          </Badge>
        )
      },
    },
    { key: 'sent_at', header: 'Sent', render: (l) => <span className="tabular-nums text-sm">{formatDate(l.sent_at, 'datetime')}</span> },
  ]

  return (
    <Layout>
      <PageHeader
        title="Email Logs"
        subtitle="Every credential/notification email the system has attempted to send"
      />

      {isError && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
          style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          Failed to load email logs. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          keyField="id"
          onRowClick={setSelected}
          searchable
          searchKeys={['recipient_email', 'subject']}
          searchPlaceholder="Search by recipient or subject..."
          emptyTitle="No emails sent yet"
          emptyDescription="Emails triggered by school approvals or manual credential resends will show up here."
        />
      )}

      {/* Detail dialog */}
      <Dialog open={selected !== null} onOpenChange={(v) => { if (!v) setSelected(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail size={16} /> {selected?.subject}</DialogTitle>
            <DialogDescription>
              To {selected?.recipient_email} &middot; {selected && formatDate(selected.sent_at, 'datetime')}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              {selected.status !== 'sent' && (
                <p className="text-xs text-[var(--muted-foreground)] rounded-lg bg-[var(--muted)]/50 p-2">
                  {selected.status === 'logged_only'
                    ? 'SMTP was not configured when this was generated — nothing was actually emailed, but the content below is exactly what would have been sent.'
                    : `Delivery failed: ${selected.error_message ?? 'unknown error'}`}
                </p>
              )}
              <div
                className="rounded-lg border border-[var(--border)] p-4 bg-white text-black text-sm overflow-x-auto"
                // Content is generated server-side from our own templates (login credentials
                // emails), not user-supplied HTML — safe to render for the audit view.
                dangerouslySetInnerHTML={{ __html: selected.body }}
              />
            </>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
