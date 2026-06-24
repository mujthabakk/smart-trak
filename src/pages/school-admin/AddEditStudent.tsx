import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Users, Camera, QrCode, Save, X, Hash,
  GraduationCap, Phone, Mail, Sparkles, MapPin,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CLASSES, DIVISIONS, RELATIONSHIPS } from '@/lib/constants'
import { allStudents } from '@/lib/mockData'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

interface StudentForm {
  fullName: string
  className: string
  division: string
  dob: string
  gender: string
  guardianName: string
  relationship: string
  phone: string
  email: string
  address: string
  pickupLocation: string
  dropLocation: string
}

function SectionCard({
  step, icon: Icon, title, description, children,
}: {
  step: number
  icon: typeof User
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)] tabular-nums">
                  Step {step}
                </span>
                <span className="text-[var(--border)]">·</span>
                {title}
              </CardTitle>
              <CardDescription className="mt-0.5">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  )
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  )
}

export default function AddEditStudent() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const existing = useMemo(
    () => (id ? allStudents.find((s) => s.id === id) ?? null : null),
    [id],
  )
  const isEdit = !!existing

  const studentId = useMemo(
    () => existing?.roll_number ? `STD-${existing.roll_number}` : `STD-${Math.floor(1000 + Math.random() * 9000)}`,
    [existing],
  )

  const [form, setForm] = useState<StudentForm>(() => ({
    fullName: existing?.name ?? '',
    className: existing?.class ?? '',
    division: existing?.division ?? '',
    dob: existing?.dob ?? '',
    gender: '',
    guardianName: existing?.parents[0]?.parent_name ?? '',
    relationship: existing?.parents[0]?.relationship ?? '',
    phone: existing?.parents[0]?.phone ?? '',
    email: existing?.parents[0]?.email ?? '',
    address: '',
    pickupLocation: '',
    dropLocation: '',
  }))

  const set = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Layout>
      <PageHeader
        title={isEdit ? 'Edit Student' : 'Add Student'}
        subtitle={isEdit ? `Editing ${existing?.name ?? 'student'}` : 'Enrol a new student'}
        breadcrumbs={[
          { label: 'Students', path: '/school-admin/students' },
          { label: isEdit ? 'Edit Student' : 'Add Student' },
        ]}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24"
      >
        {/* ── Left: form sections ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student details */}
          <SectionCard
            step={1}
            icon={User}
            title="Student Details"
            description="Basic information about the student"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div className="sm:col-span-2">
                <Field label="Full Name" htmlFor="fullName">
                  <Input
                    id="fullName"
                    placeholder="e.g. Ahmed Hassan Al-Rashid"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Class">
                <Select value={form.className} onValueChange={(v) => set('className', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Division">
                <Select value={form.division} onValueChange={(v) => set('division', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        Division {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date of Birth" htmlFor="dob">
                <Input
                  id="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => set('dob', e.target.value)}
                />
              </Field>

              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Photo upload + auto ID */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
                <Field label="Student Photo" hint="PNG or JPG, up to 2MB">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3 text-left hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                  >
                    <span className="h-10 w-10 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] flex-shrink-0">
                      <Camera size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--foreground)]">Upload photo</span>
                      <span className="block text-xs text-[var(--muted-foreground)]">Drag & drop or browse</span>
                    </span>
                  </button>
                </Field>

                <Field label="Student ID" hint="Auto-generated on enrolment">
                  <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 text-sm">
                    <Hash size={14} className="text-[var(--muted-foreground)]" />
                    <span className="font-mono font-medium text-[var(--foreground)]">{studentId}</span>
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* Guardian details */}
          <SectionCard
            step={2}
            icon={Users}
            title="Guardian Details"
            description="Primary parent or guardian contact"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <Field label="Guardian Name" htmlFor="guardianName">
                <Input
                  id="guardianName"
                  placeholder="e.g. Hassan Al-Rashid"
                  value={form.guardianName}
                  onChange={(e) => set('guardianName', e.target.value)}
                />
              </Field>

              <Field label="Relationship">
                <Select value={form.relationship} onValueChange={(v) => set('relationship', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Phone" htmlFor="phone">
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 50 123 4567"
                    className="pl-9"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Email" htmlFor="email">
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="guardian@email.com"
                    className="pl-9"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Address" htmlFor="address">
                  <Textarea
                    id="address"
                    rows={3}
                    placeholder="Home address for pickup reference"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* Transport details */}
          <SectionCard
            step={3}
            icon={MapPin}
            title="Transport Details"
            description="Student pickup and drop-off locations"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <Field label="Pickup Location" htmlFor="pickupLocation" hint="Where the student boards the bus">
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    id="pickupLocation"
                    placeholder="e.g. Al Barsha Mall Stop"
                    className="pl-9"
                    value={form.pickupLocation}
                    onChange={(e) => set('pickupLocation', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Drop Location" htmlFor="dropLocation" hint="Where the student exits the bus">
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    id="dropLocation"
                    placeholder="e.g. JBR Residential Gate 2"
                    className="pl-9"
                    value={form.dropLocation}
                    onChange={(e) => set('dropLocation', e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

        </div>

        {/* ── Right: QR preview ── */}
        <div className="lg:col-span-1">
          <motion.div variants={item} className="lg:sticky lg:top-24">
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode size={16} className="text-[var(--primary)]" />
                  Student QR Pass
                </CardTitle>
                <CardDescription>
                  Scanned by drivers to mark attendance at each stop.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <FauxQR seed={studentId} />

                <p className="mt-4 font-mono text-sm font-semibold text-[var(--foreground)]">{studentId}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                  {form.fullName || 'New student'}
                </p>
                {(form.className || form.division) && (
                  <Badge variant="muted" className="mt-2">
                    <GraduationCap size={12} className="mr-1" />
                    Class {form.className || '—'}-{form.division || '—'}
                  </Badge>
                )}

                <div className="mt-5 w-full rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-3 flex items-start gap-2">
                  <Sparkles size={14} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    A printable QR badge is generated automatically once the student is saved.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 z-30 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <p className="hidden sm:block text-xs text-[var(--muted-foreground)]">
            {isEdit
              ? `Editing ${form.fullName || existing?.name || 'student'}`
              : form.fullName ? `Enrolling ${form.fullName}` : 'Fill in the details to enrol a student'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={() => navigate('/school-admin/students')}>
              <Save size={16} /> {isEdit ? 'Save Changes' : 'Save Student'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

/** Deterministic faux-QR matrix derived from a seed string. Purely decorative. */
function FauxQR({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const size = 11
    const out: boolean[] = []
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    for (let i = 0; i < size * size; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff
      out.push((h >> 16) % 100 < 48)
    }
    return { size, out }
  }, [seed])

  const isFinder = (r: number, c: number, s: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 3 && c >= bc && c < bc + 3
    return inBox(0, 0) || inBox(0, s - 3) || inBox(s - 3, 0)
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-[var(--border)]">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${cells.size}, minmax(0, 1fr))` }}
      >
        {cells.out.map((on, i) => {
          const r = Math.floor(i / cells.size)
          const c = i % cells.size
          const finder = isFinder(r, c, cells.size)
          return (
            <div
              key={i}
              className="aspect-square rounded-[2px]"
              style={{
                width: 14,
                height: 14,
                background: finder ? 'var(--primary)' : on ? '#0f172a' : 'transparent',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
