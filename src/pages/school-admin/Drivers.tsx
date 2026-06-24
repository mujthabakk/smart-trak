import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, UserCheck, Users, Navigation, AlertTriangle, MoreVertical,
  Eye, Pencil, Bus as BusIcon, Ban, Phone, BadgeCheck, Star,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getInitials, formatDate, daysUntil } from '@/lib/utils'
import { allDrivers, allBuses } from '@/lib/mockData'
import type { Driver } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

const EXPIRY_WINDOW_DAYS = 90

// Deterministic experience + rating per driver so the table is stable.
function driverMeta(d: Driver): { years: number; rating: string } {
  const seed = d.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const years = 2 + (seed % 12)
  const rating = (4 + (seed % 10) / 10).toFixed(1)
  return { years, rating }
}

function busIsOnTrip(busId?: string): boolean {
  if (!busId) return false
  return allBuses.find((b) => b.id === busId)?.status === 'running'
}

export default function Drivers() {
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = allDrivers.length
    const active = allDrivers.filter((d) => d.is_active).length
    const onTrip = allDrivers.filter((d) => d.is_active && busIsOnTrip(d.assigned_bus_id)).length
    const expiring = allDrivers.filter((d) => daysUntil(d.license_expiry) <= EXPIRY_WINDOW_DAYS).length
    return { total, active, onTrip, expiring }
  }, [])

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Driver',
      sortable: true,
      accessor: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials(d.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{d.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Phone size={11} /> {d.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'license',
      header: 'License',
      render: (d) => {
        const days = daysUntil(d.license_expiry)
        const expired = days < 0
        const soon = !expired && days <= EXPIRY_WINDOW_DAYS
        return (
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)] flex items-center gap-1.5">
              <BadgeCheck size={13} className="text-[var(--muted-foreground)]" />
              {d.license_number}
            </p>
            <p className={`text-xs mt-0.5 ${expired ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-[var(--muted-foreground)]'}`}>
              {expired ? 'Expired ' : 'Expires '} {formatDate(d.license_expiry)}
              {soon && !expired && ' ⚠'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'assigned_bus_number',
      header: 'Assigned Bus',
      render: (d) =>
        d.assigned_bus_number ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)]">
            <BusIcon size={14} className="text-[var(--muted-foreground)]" />
            {d.assigned_bus_number}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted-foreground)]">Unassigned</span>
        ),
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (d) => {
        const meta = driverMeta(d)
        return (
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)]">{meta.years} yrs</p>
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" /> {meta.rating}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        if (d.is_active && busIsOnTrip(d.assigned_bus_id)) {
          return <StatusBadge status="running" />
        }
        return <StatusBadge status={d.is_active ? 'active' : 'inactive'} />
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (d) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/school-admin/drivers/${d.id}`)}>
                <Eye size={14} /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/school-admin/drivers/${d.id}/edit`)}>
                <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BusIcon size={14} /> Assign Bus
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Ban size={14} /> {d.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show">
        <PageHeader
          title="Drivers"
          subtitle="Driver roster, license tracking and bus assignments"
          actions={
            <Button onClick={() => navigate('/school-admin/drivers/add')}>
              <Plus size={16} /> Add Driver
            </Button>
          }
        />

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Drivers" value={stats.total} icon={Users} color="primary" />
          <StatsCard title="Active" value={stats.active} icon={UserCheck} color="success" />
          <StatsCard title="On Trip" value={stats.onTrip} icon={Navigation} color="info" />
          <StatsCard title="License Expiring" value={stats.expiring} icon={AlertTriangle} color="warning" subtitle="Within 90 days" />
        </motion.div>

        {/* Table */}
        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={allDrivers}
            keyField="id"
            searchable
            searchKeys={['name', 'phone', 'license_number', 'employee_id']}
            searchPlaceholder="Search drivers by name, phone or license…"
            onRowClick={(d) => navigate(`/school-admin/drivers/${d.id}`)}
            emptyTitle="No drivers found"
            emptyDescription="Add a driver to start assigning routes."
          />
        </motion.div>
      </motion.div>
    </Layout>
  )
}
