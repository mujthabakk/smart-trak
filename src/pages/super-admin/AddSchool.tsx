import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { listPlans } from '@/lib/api/plans'
import { createSchool } from '@/lib/api/schools'
import type { School } from '@/types'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface FormState {
  name: string
  subdomain: string
  subdomainTouched: boolean
  phone: string
  email: string
  website: string
  admin_name: string
  admin_email: string
  address: string
  city: string
  state: string
  post_code: string
  country: string
  plan_id: string
}

const EMPTY_FORM: FormState = {
  name: '', subdomain: '', subdomainTouched: false, phone: '', email: '', website: '',
  admin_name: '', admin_email: '', address: '', city: '', state: '', post_code: '', country: 'UAE',
  plan_id: '',
}

export default function AddSchool() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<School>) => createSchool(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setSaved(true)
      setTimeout(() => navigate('/super-admin/schools'), 1800)
    },
    onError: () => setError('Failed to create school. Please check the details and try again.'),
  })

  function set(field: keyof FormState, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'name' && !f.subdomainTouched) {
        next.subdomain = slugify(value)
      }
      if (field === 'subdomain') {
        next.subdomain = slugify(value)
        next.subdomainTouched = true
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() ||
        !form.city.trim() || !form.state.trim() || !form.plan_id || !form.subdomain.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    const payload: Partial<School> = {
      name: form.name,
      address: form.address,
      city: form.city,
      state: form.state,
      post_code: form.post_code || undefined,
      country: form.country || 'UAE',
      phone: form.phone,
      email: form.email,
      website: form.website || undefined,
      plan_id: form.plan_id,
      subdomain: form.subdomain,
      admin_name: form.admin_name || undefined,
      admin_email: form.admin_email || undefined,
      status: 'pending',
    }
    createMutation.mutate(payload)
  }

  if (saved) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <CheckCircle size={56} className="text-green-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">School added successfully!</h2>
          <p className="text-[var(--muted-foreground)] text-sm">Redirecting to schools list…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/schools')}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <PlusCircle size={22} className="text-[var(--primary)]" /> Add School
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">Onboard a new school onto SmartTrack. It starts as pending until approved.</p>
          </div>
        </motion.div>

        <motion.form variants={item} onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">School Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="as-name">School name *</Label>
                <Input id="as-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Greenfield Academy" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-subdomain">Subdomain *</Label>
                <div className="relative">
                  <Input id="as-subdomain" value={form.subdomain} onChange={(e) => set('subdomain', e.target.value)} placeholder="greenfield" required />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{form.subdomain || 'subdomain'}.smarttrack.app</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-phone">Phone number *</Label>
                <Input id="as-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+971-4-555-0100" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-email">School email *</Label>
                <Input id="as-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@school.ae" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-website">Website</Label>
                <Input id="as-website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="www.school.ae" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Admin Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="as-admin-name">Admin name</Label>
                <Input id="as-admin-name" value={form.admin_name} onChange={(e) => set('admin_name', e.target.value)} placeholder="Hassan Al-Rashid" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-admin-email">Admin email</Label>
                <Input id="as-admin-email" type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} placeholder="admin@school.ae" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Address Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="as-address">Street address *</Label>
                <Input id="as-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="45 Sheikh Zayed Road" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-city">City *</Label>
                <Input id="as-city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dubai" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-state">State / Emirate *</Label>
                <Input id="as-state" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Dubai" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-postcode">Post / ZIP code</Label>
                <Input id="as-postcode" value={form.post_code} onChange={(e) => set('post_code', e.target.value)} placeholder="00000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-country">Country</Label>
                <Input id="as-country" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="UAE" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Plan</p>
            {plansLoading ? (
              <div className="flex items-center justify-center py-6"><LoadingSpinner size="md" /></div>
            ) : (
              <div className="space-y-1.5">
                <Label>Subscription plan *</Label>
                <Select value={form.plan_id} onValueChange={(v) => set('plan_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/super-admin/schools')}>
              <ArrowLeft size={15} /> Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              <Save size={15} /> Add School
            </Button>
          </div>
        </motion.form>
      </motion.div>
    </Layout>
  )
}
