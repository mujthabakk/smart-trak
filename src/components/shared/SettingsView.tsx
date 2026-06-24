import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check, User, Bell, Shield, Mail, Smartphone, MessageCircle, Globe,
  Lock, Monitor, LogOut, Camera,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { getInitials, cn } from '@/lib/utils'

const NOTIFICATION_PREFS = [
  { id: 'email', label: 'Email notifications', desc: 'Receive updates in your inbox', icon: Mail, on: true },
  { id: 'push', label: 'Push notifications', desc: 'Real-time alerts in the app', icon: Bell, on: true },
  { id: 'whatsapp', label: 'WhatsApp alerts', desc: 'Trip & attendance via WhatsApp', icon: MessageCircle, on: true },
  { id: 'sms', label: 'SMS notifications', desc: 'Critical alerts by text message', icon: Smartphone, on: false },
  { id: 'digest', label: 'Weekly digest', desc: 'A summary every Monday morning', icon: Globe, on: false },
]

interface SettingsViewProps {
  scope?: 'super_admin' | 'school_admin'
}

export function SettingsView({ scope = 'super_admin' }: SettingsViewProps) {
  const { user, updateUser } = useAuthStore()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.id, p.on])),
  )
  const [twoFA, setTwoFA] = useState(true)
  const [saved, setSaved] = useState(false)

  function handleSaveProfile() {
    updateUser({ name, email, phone })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={scope === 'super_admin' ? 'Manage your platform preferences' : 'Manage your school preferences'}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="profile" className="gap-1.5"><User size={15} /> Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell size={15} /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield size={15} /> Security</TabsTrigger>
        </TabsList>

        {/* ───────── PROFILE ───────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                    {getInitials(name || 'User')}
                  </div>
                  <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] shadow-sm">
                    <Camera size={13} />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Profile photo</p>
                  <p className="text-xs text-[var(--muted-foreground)] mb-2">PNG or JPG, up to 2MB.</p>
                  <Button variant="outline" size="sm">Upload new</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name">Full Name</Label>
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">Email Address</Label>
                  <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-phone">Phone Number</Label>
                  <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-role">Role</Label>
                  <Input id="s-role" value={scope === 'super_admin' ? 'Super Administrator' : 'School Administrator'} disabled />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveProfile}>Save Changes</Button>
                {saved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 flex items-center gap-1">
                    <Check size={15} /> Saved
                  </motion.span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── NOTIFICATIONS ───────── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--border)]">
              {NOTIFICATION_PREFS.map((p) => {
                const Icon = p.icon
                return (
                  <div key={p.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{p.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{p.desc}</p>
                      </div>
                    </div>
                    <Switch checked={prefs[p.id]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.id]: v }))} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── SECURITY ───────── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock size={18} className="text-[var(--primary)]" /> Change Password</CardTitle>
              <CardDescription>Use a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="cur-pw">Current Password</Label>
                <Input id="cur-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New Password</Label>
                <Input id="new-pw" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf-pw">Confirm New Password</Label>
                <Input id="conf-pw" type="password" placeholder="••••••••" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                  <Shield size={17} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Authenticator app</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{twoFA ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
              <Switch checked={twoFA} onCheckedChange={setTwoFA} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Devices currently signed in to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { device: 'MacBook Pro · Chrome', loc: 'Dubai, UAE', current: true },
                { device: 'iPhone 15 · SmartTrack App', loc: 'Dubai, UAE', current: false },
              ].map((s) => (
                <div key={s.device} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                      <Monitor size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                        {s.device}
                        {s.current && <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-full px-1.5 py-0.5">Current</span>}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">{s.loc}</p>
                    </div>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" className="text-red-500"><LogOut size={14} /> Revoke</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

export default SettingsView
