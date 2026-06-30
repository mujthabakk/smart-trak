import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Bus as BusIcon, User, ArrowLeft,
  BadgeCheck, ShieldCheck, CalendarDays, CheckCircle2,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { allBuses, allDrivers } from '@/lib/mockData'
import { daysUntil, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const SCHOOL_ID = 'sch_001'

function expiryBadgeClass(days: number) {
  if (days < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (days < 30) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (days < 90) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
}

function expiryLabel(days: number) {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  return `${days}d`
}

type FilterType = 'all' | 'expired' | 'critical' | 'warning'

const FILTER_PILLS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expired', value: 'expired' },
  { label: 'Critical (<30d)', value: 'critical' },
  { label: 'Warning (<90d)', value: 'warning' },
]

export default function DocumentExpiry() {
  const navigate = useNavigate()
  const [busFilter, setBusFilter] = useState<FilterType>('all')
  const [driverFilter, setDriverFilter] = useState<FilterType>('all')

  const schoolBuses = useMemo(() => allBuses.filter((b) => b.school_id === SCHOOL_ID), [])
  const schoolDrivers = useMemo(() => allDrivers.filter((d) => d.school_id === SCHOOL_ID), [])

  // Bus document rows: insurance + fitness cert
  const busRows = useMemo(() => {
    return schoolBuses.flatMap((bus) => {
      const rows = []
      if (bus.insurance_expiry) {
        rows.push({
          busId: bus.id,
          busNumber: bus.bus_number,
          type: 'Insurance',
          expiry: bus.insurance_expiry,
          days: daysUntil(bus.insurance_expiry),
        })
      }
      if (bus.fitness_cert_expiry) {
        rows.push({
          busId: bus.id,
          busNumber: bus.bus_number,
          type: 'Fitness Certificate',
          expiry: bus.fitness_cert_expiry,
          days: daysUntil(bus.fitness_cert_expiry),
        })
      }
      return rows
    }).sort((a, b) => a.days - b.days)
  }, [schoolBuses])

  const filteredBusRows = useMemo(() => {
    return busRows.filter((r) => {
      if (busFilter === 'all') return true
      if (busFilter === 'expired') return r.days < 0
      if (busFilter === 'critical') return r.days >= 0 && r.days < 30
      if (busFilter === 'warning') return r.days >= 0 && r.days < 90
      return true
    })
  }, [busRows, busFilter])

  // Driver license rows
  const driverRows = useMemo(() => {
    return schoolDrivers
      .filter((d) => d.license_expiry)
      .map((d) => ({
        driverId: d.id,
        driverName: d.name,
        licenseNumber: d.license_number,
        expiry: d.license_expiry,
        days: daysUntil(d.license_expiry),
        is_active: d.is_active,
      }))
      .sort((a, b) => a.days - b.days)
  }, [schoolDrivers])

  const filteredDriverRows = useMemo(() => {
    return driverRows.filter((r) => {
      if (driverFilter === 'all') return true
      if (driverFilter === 'expired') return r.days < 0
      if (driverFilter === 'critical') return r.days >= 0 && r.days < 30
      if (driverFilter === 'warning') return r.days >= 0 && r.days < 90
      return true
    })
  }, [driverRows, driverFilter])

  // Stats
  const busExpiredCount = busRows.filter((r) => r.days < 0).length
  const busCriticalCount = busRows.filter((r) => r.days >= 0 && r.days < 30).length
  const busWarningCount = busRows.filter((r) => r.days >= 30 && r.days < 90).length
  const driverExpiredCount = driverRows.filter((r) => r.days < 0).length
  const driverCriticalCount = driverRows.filter((r) => r.days >= 0 && r.days < 30).length
  const driverWarningCount = driverRows.filter((r) => r.days >= 30 && r.days < 90).length

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
        <motion.div variants={item}>
          <PageHeader
            title="Document Expiry Alerts"
            subtitle="Track bus fitness certificates, insurance, and driver license renewals"
            breadcrumbs={[
              { label: 'Dashboard', path: '/school-admin/dashboard' },
              { label: 'Document Expiry' },
            ]}
          />
        </motion.div>

        <motion.div variants={item} className="-mt-4">
          <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)] -ml-2" onClick={() => navigate('/school-admin/dashboard')}>
            <ArrowLeft size={15} /> Back to Dashboard
          </Button>
        </motion.div>

        {/* Overall stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Bus Docs Expired"
            value={busExpiredCount}
            icon={BusIcon}
            color="danger"
          />
          <StatsCard
            title="Bus Docs Critical"
            value={busCriticalCount}
            icon={AlertTriangle}
            color="danger"
            subtitle="< 30 days"
          />
          <StatsCard
            title="Driver Licenses Expired"
            value={driverExpiredCount}
            icon={User}
            color="danger"
          />
          <StatsCard
            title="Driver Licenses Critical"
            value={driverCriticalCount}
            icon={BadgeCheck}
            color="warning"
            subtitle="< 30 days"
          />
        </motion.div>

        {/* Legend */}
        <motion.div variants={item} className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] px-1">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Expired or &lt;30 days</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> 30–90 days</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> 90+ days (OK)</span>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="buses">
            <TabsList className="mb-4">
              <TabsTrigger value="buses" className="flex items-center gap-1.5">
                <BusIcon size={14} />
                Bus Documents
                {(busExpiredCount + busCriticalCount) > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {busExpiredCount + busCriticalCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex items-center gap-1.5">
                <User size={14} />
                Driver Licenses
                {(driverExpiredCount + driverCriticalCount) > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {driverExpiredCount + driverCriticalCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Bus Documents Tab */}
            <TabsContent value="buses" className="flex flex-col gap-4">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => setBusFilter(pill.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      busFilter === pill.value
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]',
                    )}
                  >
                    {pill.label}
                    {pill.value === 'expired' && busExpiredCount > 0 && ` (${busExpiredCount})`}
                    {pill.value === 'critical' && busCriticalCount > 0 && ` (${busCriticalCount})`}
                    {pill.value === 'warning' && busWarningCount > 0 && ` (${busWarningCount})`}
                  </button>
                ))}
              </div>

              {filteredBusRows.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-12 text-center">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[var(--foreground)]">All bus documents are up to date</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-[var(--muted)]/40 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    <span>Bus</span>
                    <span>Document Type</span>
                    <span>Expiry Date</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {filteredBusRows.map((row, idx) => (
                      <div
                        key={`${row.busId}-${row.type}-${idx}`}
                        className={cn(
                          'grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[var(--muted)]/30 transition-colors',
                          row.days < 30 && 'bg-red-50/40 dark:bg-red-900/5',
                        )}
                      >
                        <button
                          onClick={() => navigate(`/school-admin/buses/${row.busId}`)}
                          className="flex items-center gap-2.5 text-left"
                        >
                          <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                            <BusIcon size={15} className="text-[var(--primary)]" />
                          </div>
                          <span className="text-sm font-semibold text-[var(--primary)] hover:underline">{row.busNumber}</span>
                        </button>
                        <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                          {row.type === 'Insurance' ? <ShieldCheck size={14} className="text-[var(--muted-foreground)]" /> : <CalendarDays size={14} className="text-[var(--muted-foreground)]" />}
                          {row.type}
                        </div>
                        <span className="text-sm text-[var(--foreground)]">{formatDate(row.expiry, 'date')}</span>
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', expiryBadgeClass(row.days))}>
                          {expiryLabel(row.days)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Driver Licenses Tab */}
            <TabsContent value="drivers" className="flex flex-col gap-4">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => setDriverFilter(pill.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      driverFilter === pill.value
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]',
                    )}
                  >
                    {pill.label}
                    {pill.value === 'expired' && driverExpiredCount > 0 && ` (${driverExpiredCount})`}
                    {pill.value === 'critical' && driverCriticalCount > 0 && ` (${driverCriticalCount})`}
                    {pill.value === 'warning' && driverWarningCount > 0 && ` (${driverWarningCount})`}
                  </button>
                ))}
              </div>

              {filteredDriverRows.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-12 text-center">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[var(--foreground)]">All driver licenses are up to date</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-[var(--muted)]/40 border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    <span>Driver</span>
                    <span>License No.</span>
                    <span>Expiry Date</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {filteredDriverRows.map((row) => (
                      <div
                        key={row.driverId}
                        className={cn(
                          'grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[var(--muted)]/30 transition-colors',
                          row.days < 30 && 'bg-red-50/40 dark:bg-red-900/5',
                        )}
                      >
                        <button
                          onClick={() => navigate(`/school-admin/drivers/${row.driverId}`)}
                          className="flex items-center gap-2.5 text-left"
                        >
                          <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                            <User size={15} className="text-[var(--primary)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--primary)] hover:underline truncate">{row.driverName}</p>
                            {!row.is_active && (
                              <p className="text-xs text-[var(--muted-foreground)]">Inactive</p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                          <BadgeCheck size={14} className="text-[var(--muted-foreground)]" />
                          <span className="font-mono text-xs">{row.licenseNumber}</span>
                        </div>
                        <span className="text-sm text-[var(--foreground)]">{formatDate(row.expiry, 'date')}</span>
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', expiryBadgeClass(row.days))}>
                          {expiryLabel(row.days)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
