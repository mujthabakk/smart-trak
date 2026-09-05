import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { UserPlus, KeyRound, Copy, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { createGuestDriver, type GuestDriverInput, type GuestDriverCredentials } from '@/lib/api/drivers'

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message || 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

type GuestForm = {
  name: string
  email: string
  phone: string
  license_number: string
  license_expiry: string
  guest_validity_type: 'trips' | 'days'
  guest_validity_value: string
}

const emptyGuestForm = (): GuestForm => ({
  name: '',
  email: '',
  phone: '',
  license_number: '',
  license_expiry: '',
  guest_validity_type: 'trips',
  guest_validity_value: '',
})

/**
 * Self-contained "Add Guest Driver" trigger + dialog — creates a real driver
 * account (login, can start/end trips like any driver) that expires after
 * N trips or N days. Shared between the Drivers page and the Guest Drivers
 * page so both stay in sync with a single implementation.
 */
export default function AddGuestDriverDialog() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<GuestForm>(emptyGuestForm())
  const [error, setError] = useState<string | null>(null)
  // Set once creation succeeds — the one-time password display, shown in
  // place of the form until the admin closes it.
  const [credentials, setCredentials] = useState<GuestDriverCredentials | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = useMutation({
    mutationFn: (payload: GuestDriverInput) => createGuestDriver(payload),
    onSuccess: ({ credentials: creds }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      setError(null)
      setCredentials(creds)
    },
    onError: (err) => setError(extractErrorMessage(err)),
  })

  function close() {
    setOpen(false)
    setForm(emptyGuestForm())
    setError(null)
    setCredentials(null)
    setCopied(false)
  }

  function submit() {
    setError(null)
    const value = parseInt(form.guest_validity_value, 10)
    if (!value || value <= 0) {
      setError('Enter a validity value greater than 0.')
      return
    }
    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      license_number: form.license_number.trim(),
      license_expiry: form.license_expiry,
      guest_validity_type: form.guest_validity_type,
      guest_validity_value: value,
    })
  }

  async function copyPassword() {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(credentials.password)
      setCopied(true)
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the
      // password is still fully visible on screen to copy by hand.
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus size={16} /> Add Guest Driver
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); else setOpen(true) }}>
        <DialogContent className="sm:max-w-md">
          {credentials ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound size={18} className="text-[var(--primary)]" /> Guest Driver Created
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Share these login details with the driver now — the password won't be shown again
                  (it's also been emailed to them).
                </p>
                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Email</p>
                    <p className="text-sm font-medium text-[var(--foreground)]">{credentials.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Temporary Password</p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 select-all rounded-md bg-[var(--background)] px-2 py-1 font-mono text-sm text-[var(--foreground)]">
                        {credentials.password}
                      </p>
                      <Button size="sm" variant="outline" onClick={copyPassword}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={close}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus size={18} className="text-[var(--primary)]" /> Add Guest Driver
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="guest-name">Full Name</Label>
                  <Input
                    id="guest-name"
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="guest-email">Email</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="guest-phone">Phone</Label>
                  <Input
                    id="guest-phone"
                    placeholder="+971…"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="guest-license">License Number</Label>
                    <Input
                      id="guest-license"
                      placeholder="LIC123456"
                      value={form.license_number}
                      onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="guest-expiry">License Expiry</Label>
                    <Input
                      id="guest-expiry"
                      type="date"
                      value={form.license_expiry}
                      onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Access Validity</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={form.guest_validity_type}
                      onValueChange={(v: 'trips' | 'days') => setForm((f) => ({ ...f, guest_validity_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trips">Number of trips</SelectItem>
                        <SelectItem value="days">Number of days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      placeholder={form.guest_validity_type === 'trips' ? 'e.g. 5' : 'e.g. 7'}
                      value={form.guest_validity_value}
                      onChange={(e) => setForm((f) => ({ ...f, guest_validity_value: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {form.guest_validity_type === 'trips'
                      ? 'Login and driving access is revoked once this many trips have been started.'
                      : 'Login and driving access is revoked once this many days have passed.'}
                  </p>
                </div>
              </div>
              {error && (
                <p className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button
                  onClick={submit}
                  disabled={
                    !form.name.trim() || !form.email.trim() || !form.phone.trim()
                    || !form.license_number.trim() || !form.license_expiry
                    || !form.guest_validity_value || createMutation.isPending
                  }
                  loading={createMutation.isPending}
                >
                  Add Guest Driver
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
