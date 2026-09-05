import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus, UserCheck, Route as RouteIcon, Phone, Mail, Timer, Ban, Trash2, Eye,
  IdCard, Users, AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import AddGuestDriverDialog from '@/components/shared/AddGuestDriverDialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { listGuestTrips, updateGuestTrip } from '@/lib/api/guestTrips'
import { listDrivers, updateDriver, deleteDriver } from '@/lib/api/drivers'
import { formatDate, getInitials, guestBudgetLabel } from '@/lib/utils'
import type { GuestTripStatus, Driver } from '@/types'

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    return data?.error || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

const DOC_META: Record<string, { license: string; docsVerified: boolean }> = {
  gt_001: { license: 'DXB-G-90011', docsVerified: true },
  gt_002: { license: 'DXB-G-90012', docsVerified: false },
}
function docMeta(id: string) {
  return DOC_META[id] ?? { license: `DXB-G-${id.slice(-4).padStart(4, '0')}`, docsVerified: false }
}

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

export default function GuestDrivers() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-trips'],
    queryFn: () => listGuestTrips({}),
  })
  const trips = useMemo(() => data?.trips ?? [], [data])

  // Guest driver ACCOUNTS — distinct from the guest_trips requests above:
  // real logins created via "Add Guest Driver", listed here too so they
  // don't only show up on the separate Drivers page.
  const { data: guestDriversData, isLoading: isLoadingAccounts, isError: isErrorAccounts } = useQuery({
    queryKey: ['drivers', 'guest'],
    queryFn: () => listDrivers({ is_guest: true }),
  })
  const guestDriverAccounts = useMemo(() => guestDriversData?.drivers ?? [], [guestDriversData])

  const toggleActiveMutation = useMutation({
    mutationFn: (d: Driver) => updateDriver(d.id, { is_active: !d.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers', 'guest'] }),
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers', 'guest'] }),
    onError: (err) => window.alert(extractErrorMessage(err)),
  })

  function handleDeleteAccount(d: Driver) {
    if (!window.confirm(`Permanently delete ${d.name}? This can't be undone. (If they have any trip history, deletion will be blocked — deactivate them instead.)`)) return
    deleteAccountMutation.mutate(d.id)
  }

  const stats = useMemo(() => ({
    total: trips.length,
    active: trips.filter((t) => t.status === 'approved' && t.started_at && !t.ended_at).length,
    completed: trips.filter((t) => t.status === 'completed').length,
  }), [trips])

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GuestTripStatus }) => updateGuestTrip(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-trips'] })
    },
  })

  return (
    <Layout>
      <PageHeader
        title="Guest Drivers"
        subtitle="Manage temporary drivers for your school"
        actions={<AddGuestDriverDialog />}
      />

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard title="Total Drivers" value={stats.total} icon={UserPlus} color="info" />
          <StatsCard title="Active Trips" value={stats.active} icon={RouteIcon} color="success" subtitle="on the road" />
          <StatsCard title="Completed" value={stats.completed} icon={UserCheck} color="primary" />
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <RouteIcon size={16} className="text-[var(--primary)]" />
            Guest Trip Requests
          </h2>
          {isError && <ErrorBanner message="Failed to load guest drivers. Please try again." />}

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={UserPlus}
                title="No guest trip requests"
                description="Temporary drivers requested for a specific trip will appear here."
              />
            </div>
          ) : (
            trips.map((trip) => {
              const meta = docMeta(trip.id)
              return (
                <motion.div
                  key={trip.id}
                  variants={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Driver */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarFallback className="bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                          {getInitials(trip.guest_driver_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{trip.guest_driver_name}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Phone size={11} /> {trip.guest_driver_phone}
                        </p>
                      </div>
                    </div>

                    {/* License */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <IdCard size={13} className="text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)]">{meta.license}</span>
                      </p>
                    </div>

                    {/* Assigned trip */}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <RouteIcon size={13} className="text-[var(--primary)]" />
                        Bus {trip.bus_registration}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <Users size={13} className="text-[var(--primary)]" />
                        {trip.students.length} student{trip.students.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    {/* Status + Added date */}
                    <div className="min-w-0">
                      <StatusBadge status={trip.status} size="sm" />
                      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Added</p>
                      <p className="text-xs text-[var(--foreground)]">
                        {formatDate(trip.created_at, 'datetime')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {trip.status === 'pending_approval' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'approved' })}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'rejected' })}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </>
                      )}
                      {trip.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({ id: trip.id, status: 'completed' })}
                        >
                          <UserCheck size={14} /> Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>

        <motion.div variants={item} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <UserPlus size={16} className="text-[var(--primary)]" />
            Guest Driver Accounts
          </h2>
          {isErrorAccounts && <ErrorBanner message="Failed to load guest driver accounts. Please try again." />}

          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : guestDriverAccounts.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                icon={UserPlus}
                title="No guest driver accounts"
                description='Accounts created via "Add Guest Driver" — real logins that expire after a number of trips or days — will appear here.'
              />
            </div>
          ) : (
            <div className="space-y-3">
              {guestDriverAccounts.map((d) => (
                <motion.div
                  key={d.id}
                  variants={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarFallback className="bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {getInitials(d.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{d.name}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Phone size={11} /> {d.phone}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] truncate">
                          <Mail size={11} /> {d.email}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <IdCard size={13} className="text-[var(--primary)]" />
                        <span className="font-medium text-[var(--foreground)]">{d.employee_id}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Timer size={13} /> {guestBudgetLabel(d)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <StatusBadge status={d.is_active ? 'active' : 'inactive'} size="sm" />
                      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Added</p>
                      <p className="text-xs text-[var(--foreground)]">{formatDate(d.created_at, 'datetime')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/school-admin/drivers/${d.id}`)}>
                        <Eye size={14} /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleActiveMutation.isPending}
                        onClick={() => toggleActiveMutation.mutate(d)}
                      >
                        <Ban size={14} /> {d.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteAccountMutation.isPending}
                        onClick={() => handleDeleteAccount(d)}
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

    </Layout>
  )
}
