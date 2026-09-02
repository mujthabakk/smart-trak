import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Check, User, Bell, Shield, Mail, Smartphone, MessageCircle, Globe,
  Lock, Camera, AlertCircle, Building2,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateUser as updateUserAction } from '@/store/slices/authSlice'
import { changePassword } from '@/lib/api/auth'
import { getSchool, updateSchool } from '@/lib/api/schools'
import { LocationPicker } from '@/components/shared/LocationPicker'
import type { School } from '@/types'
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

interface SchoolForm {
  address: string
  city: string
  state: string
  post_code: string
  country: string
  phone: string
  website: string
  latitude: string
  longitude: string
}

function schoolToForm(s: School): SchoolForm {
  return {
    address: s.address ?? '',
    city: s.city ?? '',
    state: s.state ?? '',
    post_code: s.post_code ?? '',
    country: s.country ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    latitude: s.latitude != null ? String(s.latitude) : '',
    longitude: s.longitude != null ? String(s.longitude) : '',
  }
}

export function SettingsView({ scope = 'super_admin' }: SettingsViewProps) {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const user = useAppSelector((s) => s.auth.user)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.id, p.on])),
  )
  const [saved, setSaved] = useState(false)

  function handleSaveProfile() {
    dispatch(updateUserAction({ name, email, phone }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── School contact/address details (school_admin only — plan, status,
  // subdomain and admin credentials stay super_admin-only, edited elsewhere) ──
  const schoolId = user?.school_id
  const { data: school } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => getSchool(schoolId as string),
    enabled: scope === 'school_admin' && !!schoolId,
  })
  const [schoolForm, setSchoolForm] = useState<SchoolForm>(schoolToForm({} as School))
  useEffect(() => {
    if (school) setSchoolForm(schoolToForm(school))
  }, [school])
  const [schoolSaved, setSchoolSaved] = useState(false)
  const [schoolError, setSchoolError] = useState('')

  const updateSchoolMutation = useMutation({
    mutationFn: () =>
      updateSchool(schoolId as string, {
        address: schoolForm.address,
        city: schoolForm.city,
        state: schoolForm.state,
        post_code: schoolForm.post_code || undefined,
        country: schoolForm.country || undefined,
        phone: schoolForm.phone,
        website: schoolForm.website || undefined,
        latitude: schoolForm.latitude.trim() === '' ? undefined : Number(schoolForm.latitude),
        longitude: schoolForm.longitude.trim() === '' ? undefined : Number(schoolForm.longitude),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      setSchoolSaved(true)
      setSchoolError('')
      setTimeout(() => setSchoolSaved(false), 2000)
    },
    onError: () => setSchoolError('Failed to save school details. Please try again.'),
  })

  function setSchoolField(field: keyof SchoolForm, value: string) {
    setSchoolForm((f) => ({ ...f, [field]: value }))
    setSchoolSaved(false)
  }

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwError('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 2500)
    },
    onError: (err) => {
      const message = isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined
      setPwError(message || 'Failed to update password.')
    },
  })

  function handleChangePassword() {
    setPwError('')
    if (!currentPw) { setPwError('Enter your current password.'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    changePasswordMutation.mutate()
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
          {scope === 'school_admin' && (
            <TabsTrigger value="school" className="gap-1.5"><Building2 size={15} /> School</TabsTrigger>
          )}
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

        {/* ───────── SCHOOL (school_admin only) ───────── */}
        {scope === 'school_admin' && (
          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle>School Details</CardTitle>
                <CardDescription>
                  Contact and address details for your school. Plan and subscription changes are handled by SmartTrack support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {schoolError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
                  >
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {schoolError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="sc-address">Street address</Label>
                    <Input id="sc-address" value={schoolForm.address} onChange={(e) => setSchoolField('address', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-city">City</Label>
                    <Input id="sc-city" value={schoolForm.city} onChange={(e) => setSchoolField('city', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-state">State / Emirate</Label>
                    <Input id="sc-state" value={schoolForm.state} onChange={(e) => setSchoolField('state', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-postcode">Post / ZIP code</Label>
                    <Input id="sc-postcode" value={schoolForm.post_code} onChange={(e) => setSchoolField('post_code', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-country">Country</Label>
                    <Input id="sc-country" value={schoolForm.country} onChange={(e) => setSchoolField('country', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-phone">Phone number</Label>
                    <Input id="sc-phone" value={schoolForm.phone} onChange={(e) => setSchoolField('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-website">Website</Label>
                    <Input id="sc-website" value={schoolForm.website} onChange={(e) => setSchoolField('website', e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>School location</Label>
                    <LocationPicker
                      latitude={schoolForm.latitude.trim() === '' ? undefined : Number(schoolForm.latitude)}
                      longitude={schoolForm.longitude.trim() === '' ? undefined : Number(schoolForm.longitude)}
                      onChange={(lat, lng) => {
                        setSchoolField('latitude', String(lat))
                        setSchoolField('longitude', String(lng))
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => updateSchoolMutation.mutate()} loading={updateSchoolMutation.isPending}>Save Changes</Button>
                  {schoolSaved && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 flex items-center gap-1">
                      <Check size={15} /> Saved
                    </motion.span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
              {pwError && (
                <div
                  className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {pwError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cur-pw">Current Password</Label>
                <Input id="cur-pw" type="password" placeholder="••••••••" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New Password</Label>
                <Input id="new-pw" type="password" placeholder="••••••••" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf-pw">Confirm New Password</Label>
                <Input id="conf-pw" type="password" placeholder="••••••••" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleChangePassword} loading={changePasswordMutation.isPending}>Update Password</Button>
                {pwSaved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 flex items-center gap-1">
                    <Check size={15} /> Password updated
                  </motion.span>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </>
  )
}

export default SettingsView
