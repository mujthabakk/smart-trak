import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Download, Users, UserCheck, UserX, MoreVertical,
  Eye, Pencil, QrCode, Ban,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/shared/PageHeader'
import { StatsCard } from '@/components/shared/StatsCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getInitials, downloadCSV } from '@/lib/utils'
import { CLASSES } from '@/lib/constants'
import { allStudents } from '@/lib/mockData'
import type { Student } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Students() {
  const navigate = useNavigate()
  const [classFilter, setClassFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')

  const routes = useMemo(() => {
    const set = new Set<string>()
    allStudents.forEach((s) => s.route_name && set.add(s.route_name))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    return allStudents.filter((s) => {
      if (classFilter !== 'all' && s.class !== classFilter) return false
      if (routeFilter !== 'all' && s.route_name !== routeFilter) return false
      return true
    })
  }, [classFilter, routeFilter])

  const stats = useMemo(() => {
    const total = allStudents.length
    const active = allStudents.filter((s) => s.is_active).length
    const assigned = allStudents.filter((s) => s.route_name).length
    return { total, active, assigned }
  }, [])

  function handleExport() {
    const rows = filtered.map((s) => ({
      Name: s.name,
      Class: `${s.class}${s.division}`,
      'Roll No': s.roll_number,
      Guardian: s.parents[0]?.parent_name ?? '',
      Phone: s.parents[0]?.phone ?? '',
      Route: s.route_name ?? '',
      Status: s.is_active ? 'Active' : 'Inactive',
    }))
    downloadCSV(rows, 'students')
  }

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student',
      sortable: true,
      accessor: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{s.name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Class {s.class}-{s.division} · Roll {s.roll_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'guardian',
      header: 'Parent / Guardian',
      render: (s) => {
        const p = s.parents[0]
        if (!p) return <span className="text-[var(--muted-foreground)]">—</span>
        return (
          <div className="min-w-0">
            <p className="text-sm text-[var(--foreground)] truncate">{p.parent_name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{p.phone}</p>
          </div>
        )
      },
    },
    {
      key: 'route_name',
      header: 'Route',
      render: (s) =>
        s.route_name ? (
          <span className="text-sm text-[var(--foreground)]">{s.route_name}</span>
        ) : (
          <span className="text-sm text-[var(--muted-foreground)]">Not assigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-12',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/school-admin/students/${s.id}`)}>
                <Eye size={14} /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/school-admin/students/${s.id}/edit`)}>
                <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <QrCode size={14} /> QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>
                <Ban size={14} /> {s.is_active ? 'Deactivate' : 'Activate'}
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
          title="Students"
          subtitle="Manage enrolled students, routes and guardians"
          actions={
            <>
              <Button variant="outline" onClick={handleExport}>
                <Download size={16} /> Export CSV
              </Button>
              <Button onClick={() => navigate('/school-admin/students/add')}>
                <Plus size={16} /> Add Student
              </Button>
            </>
          }
        />

        {/* Summary stats */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Total Students" value={stats.total} icon={Users} color="primary" />
          <StatsCard title="Active" value={stats.active} icon={UserCheck} color="success" />
          <StatsCard title="Route Assigned" value={stats.assigned} icon={UserX} color="info" subtitle={`${stats.total - stats.assigned} unassigned`} />
        </motion.div>

        {/* Filters + Table */}
        <motion.div variants={item}>
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            searchable
            searchKeys={['name', 'roll_number']}
            searchPlaceholder="Search students by name or roll no…"
            onRowClick={(s) => navigate(`/school-admin/students/${s.id}`)}
            emptyTitle="No students found"
            emptyDescription="Try adjusting your class or route filters."
            toolbar={
              <>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        </motion.div>
      </motion.div>
    </Layout>
  )
}
