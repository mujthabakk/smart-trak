import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mail, Phone, Building2, Shield, Calendar, MapPin, Pencil,
  CheckCircle2, LogIn, Bus, Bell, Settings as SettingsIcon,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { getInitials, getRoleLabel, formatDate } from '@/lib/utils'

const ACTIVITY = [
  { icon: LogIn, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', text: 'Signed in from Dubai, UAE', time: '2026-06-23T08:02:00Z' },
  { icon: Bus, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', text: 'Approved bus transfer for Route 4', time: '2026-06-22T15:20:00Z' },
  { icon: Bell, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', text: 'Sent broadcast to all parents', time: '2026-06-22T11:05:00Z' },
  { icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', text: 'Updated notification preferences', time: '2026-06-21T09:40:00Z' },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, role } = useAuthStore()

  const settingsPath = role === 'super_admin' ? '/super-admin/settings' : '/school-admin/settings'
  const name = user?.name ?? 'User'

  const info = [
    { icon: Mail, label: 'Email', value: user?.email ?? '—' },
    { icon: Phone, label: 'Phone', value: user?.phone ?? '+971 50 123 4567' },
    { icon: Shield, label: 'Role', value: getRoleLabel(role ?? 'school_admin') },
    { icon: Building2, label: 'Organization', value: user?.school_name ?? 'SmartTrack HQ' },
    { icon: MapPin, label: 'Location', value: 'Dubai, United Arab Emirates' },
    { icon: Calendar, label: 'Member since', value: 'January 2026' },
  ]

  return (
    <Layout>
      <PageHeader
        title="My Profile"
        subtitle="Your account overview and recent activity"
        actions={<Button onClick={() => navigate(settingsPath)}><Pencil size={15} /> Edit Profile</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]" />
            <CardContent className="pt-0">
              <div className="-mt-12 flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[var(--card)] shadow-lg">
                  {getInitials(name)}
                </div>
                <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">{name}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{user?.email}</p>
                <Badge variant="info" className="mt-2">{getRoleLabel(role ?? 'school_admin')}</Badge>

                <div className="mt-5 grid grid-cols-2 gap-3 w-full">
                  <div className="rounded-xl bg-[var(--muted)]/50 p-3">
                    <p className="text-xl font-bold text-[var(--foreground)]">128</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Actions</p>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)]/50 p-3">
                    <p className="text-xl font-bold text-[var(--foreground)]">98%</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Uptime</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={() => navigate(settingsPath)}>
                  <SettingsIcon size={15} /> Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Details + activity */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  {info.map((i) => {
                    const Icon = i.icon
                    return (
                      <div key={i.label} className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] flex-shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--muted-foreground)]">{i.label}</p>
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{i.value}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {ACTIVITY.map((a, i) => {
                    const Icon = a.icon
                    return (
                      <div key={i} className="flex items-start gap-3 px-6 py-3.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--foreground)]">{a.text}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(a.time, 'relative')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}
