import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MessageSquare, Bus as BusIcon,
  Navigation, BadgeCheck, Calendar, User, Hash, AlertTriangle,
  CheckCircle2, XCircle, CalendarOff, Clock,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import HorizontalCalendar from '@/components/shared/HorizontalCalendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { allDrivers, allBuses, allRoutes, allTrips } from '@/lib/mockData'
import { getInitials, formatDate, daysUntil } from '@/lib/utils'
import { cn } from '@/lib/utils'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mock trip history for the driver
function makeTripHistory(driverId: string) {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateStr(d)
    const seed = (driverId.charCodeAt(4) + i) % 3
    const status = seed === 0 ? 'completed' : seed === 1 ? 'completed' : 'completed'
    return {
      id: `th_${driverId}_${i}`,
      date: dateStr,
      route: i % 2 === 0 ? 'Route A - Pickup' : 'Route A - Drop',
      startTime: i % 2 === 0 ? '7:00 AM' : '2:30 PM',
      endTime: i % 2 === 0 ? '8:30 AM' : '3:45 PM',
      students: 25 + (i % 5),
      status,
    }
  })
}

interface DetailRowProps { label: string; value?: string | number; danger?: boolean; children?: React.ReactNode }
function DetailRow({ label, value, danger, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      {children ?? (
        <span className={cn('text-sm font-medium', danger ? 'text-red-600 dark:text-red-400' : 'text-[var(--foreground)]')}>
          {value ?? '—'}
        </span>
      )}
    </div>
  )
}

function expiryBadgeClass(days: number) {
  if (days < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (days < 30) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (days < 90) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
}

function expiryLabel(days: number) {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires Today'
  return `${days}d left`
}

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()))

  const driver = useMemo(() => allDrivers.find((d) => d.id === id), [id])
  const bus = useMemo(() => (driver?.assigned_bus_id ? allBuses.find((b) => b.id === driver.assigned_bus_id) : undefined), [driver])
  const routes = useMemo(() => allRoutes.filter((r) => r.driver_id === id), [id])
  const trips = useMemo(() => allTrips.filter((t) => t.driver_id === id), [id])
  const tripHistory = useMemo(() => (id ? makeTripHistory(id) : []), [id])

  const dayMeta = useMemo(() =>
    tripHistory.map((t) => ({ date: t.date, dot: 'green' as const })),
    [tripHistory],
  )

  const tripsOnDate = useMemo(
    () => tripHistory.filter((t) => t.date === selectedDate),
    [tripHistory, selectedDate],
  )

  if (!driver) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
          <User size={48} className="text-[var(--muted-foreground)]" />
          <p className="text-lg font-semibold text-[var(--foreground)]">Driver not found</p>
          <Button onClick={() => navigate('/school-admin/drivers')}>
            <ArrowLeft size={16} /> Back to Drivers
          </Button>
        </div>
      </Layout>
    )
  }

  const licenseDays = daysUntil(driver.license_expiry)
  const completedTrips = trips.filter((t) => t.status === 'completed').length

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
        {/* Header */}
        <motion.div variants={item}>
          <PageHeader
            title={driver.name}
            subtitle={`Employee ID: ${driver.employee_id}`}
            breadcrumbs={[
              { label: 'Drivers', path: '/school-admin/drivers' },
              { label: driver.name },
            ]}
            actions={
              <>
                <StatusBadge status={driver.is_active ? 'running' : 'offline'} />
                <a
                  href={`tel:${driver.phone}`}
                  className="inline-flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-[var(--border)] bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)] font-medium"
                >
                  <Phone size={15} /> Call
                </a>
                <a
                  href={`mailto:${driver.email}`}
                  className="inline-flex items-center gap-2 h-8 px-3 text-xs rounded-md border border-[var(--border)] bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)] font-medium"
                >
                  <Mail size={15} /> Email
                </a>
              </>
            }
          />
        </motion.div>

        <motion.div variants={item} className="-mt-4">
          <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)] -ml-2" onClick={() => navigate('/school-admin/drivers')}>
            <ArrowLeft size={15} /> Back to Drivers
          </Button>
        </motion.div>

        {/* Profile card */}
        <motion.div variants={item} className="flex items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <Avatar className="h-20 w-20 flex-shrink-0">
            <AvatarFallback className="text-2xl font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
              {getInitials(driver.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{driver.name}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{driver.employee_id} · {driver.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bus && (
                <button
                  onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                >
                  <BusIcon size={12} className="text-[var(--primary)]" />
                  {bus.bus_number}
                </button>
              )}
              <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', expiryBadgeClass(licenseDays))}>
                <BadgeCheck size={12} /> License: {expiryLabel(licenseDays)}
              </span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1.5 text-right flex-shrink-0">
            <p className="text-2xl font-bold text-[var(--foreground)]">{completedTrips}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Trips completed</p>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Assigned Bus', value: bus?.bus_number ?? 'Unassigned', icon: BusIcon },
            { label: 'Routes', value: routes.length, icon: Navigation },
            { label: 'License Expiry', value: formatDate(driver.license_expiry, 'date'), icon: Calendar },
            { label: 'Total Trips', value: trips.length, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                  <p className="text-base font-bold text-[var(--foreground)] truncate">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={item}>
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="trips">Trip History</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
            </TabsList>

            {/* Details tab */}
            <TabsContent value="details" className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Full Name" value={driver.name} />
                  <DetailRow label="Employee ID" value={driver.employee_id} />
                  <DetailRow label="Email" value={driver.email} />
                  <DetailRow label="Phone" value={driver.phone} />
                  <DetailRow label="WhatsApp" value={driver.whatsapp} />
                  {driver.address && <DetailRow label="Address" value={driver.address} />}
                  <DetailRow label="Status">
                    <StatusBadge status={driver.is_active ? 'running' : 'offline'} size="sm" />
                  </DetailRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">License & Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="License Number" value={driver.license_number} />
                  <DetailRow
                    label="License Expiry"
                    value={formatDate(driver.license_expiry, 'date')}
                    danger={licenseDays < 30}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{formatDate(driver.license_expiry, 'date')}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', expiryBadgeClass(licenseDays))}>
                        {expiryLabel(licenseDays)}
                      </span>
                    </div>
                  </DetailRow>
                  <DetailRow label="Assigned Bus">
                    {bus ? (
                      <button
                        onClick={() => navigate(`/school-admin/buses/${bus.id}`)}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        {bus.bus_number}
                      </button>
                    ) : <span className="text-sm text-[var(--muted-foreground)]">Unassigned</span>}
                  </DetailRow>
                  <DetailRow label="Joined" value={formatDate(driver.created_at, 'date')} />
                </CardContent>
              </Card>

              {/* License expiry alert */}
              {licenseDays < 90 && (
                <div className={cn(
                  'col-span-full flex items-start gap-3 rounded-xl border p-4',
                  licenseDays < 0
                    ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10'
                    : licenseDays < 30
                    ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10',
                )}>
                  <AlertTriangle size={18} className={licenseDays < 30 ? 'text-red-600' : 'text-amber-600'} />
                  <div>
                    <p className={cn('text-sm font-semibold', licenseDays < 30 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>
                      {licenseDays < 0 ? 'License Expired' : 'License Expiring Soon'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {licenseDays < 0
                        ? `This driver's license expired ${Math.abs(licenseDays)} days ago. Renewal is required before they can operate.`
                        : `License expires in ${licenseDays} days on ${formatDate(driver.license_expiry, 'date')}. Please arrange renewal.`}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Trip History tab */}
            <TabsContent value="trips" className="flex flex-col gap-4">
              <Card>
                <CardContent className="pt-4">
                  <HorizontalCalendar
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    dayMeta={dayMeta}
                  />
                </CardContent>
              </Card>

              <div className="text-sm font-medium text-[var(--muted-foreground)] px-1">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {tripsOnDate.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-10 text-center">
                  <Clock size={32} className="mx-auto mb-2 text-[var(--muted-foreground)]" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--muted-foreground)]">No trips on this date.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tripsOnDate.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                          <Navigation size={18} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{t.route}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {t.startTime} – {t.endTime} · {t.students} students
                          </p>
                        </div>
                        <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 text-xs font-semibold">
                          {t.status}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Routes tab */}
            <TabsContent value="routes" className="flex flex-col gap-3">
              {routes.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-10 text-center">
                  <Navigation size={32} className="mx-auto mb-2 text-[var(--muted-foreground)]" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--muted-foreground)]">No routes assigned to this driver.</p>
                </div>
              ) : (
                routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => navigate(`/school-admin/routes/${route.id}`)}
                    className="text-left rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)]/30 transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Navigation size={18} className="text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{route.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {route.start_point} → {route.end_point} · {route.student_count ?? 0} students
                      </p>
                    </div>
                    <Badge variant={route.type === 'pickup' ? 'info' : 'secondary'} className="flex-shrink-0 text-xs">
                      {route.type === 'pickup' ? 'Pickup' : 'Drop'}
                    </Badge>
                  </button>
                ))
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
