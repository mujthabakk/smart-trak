import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { checkSchoolCodeAvailable } from '@/lib/api/schools'

interface SchoolCodeFieldProps {
  idPrefix: string
  value: string
  onChange: (value: string) => void
}

/** School Code input with a debounced live "is this taken" check against
 * GET /schools/check-code — this is the school's login identifier
 * (schools.id), a collision only ever surfaced today as a generic 409 at
 * submit time, so catching it while typing is a lot more useful. */
export function SchoolCodeField({ idPrefix, value, onChange }: SchoolCodeFieldProps) {
  // Only ever written to from the async result callback below (never
  // synchronously in the effect body) — "checking" is derived by comparing
  // result.code against the current code, not stored as its own state.
  const [result, setResult] = useState<{ code: string; outcome: 'available' | 'taken' | 'error' } | null>(null)
  const code = value.trim()

  useEffect(() => {
    if (code.length < 3) return
    let cancelled = false
    const handle = setTimeout(() => {
      checkSchoolCodeAvailable(code)
        .then((available) => {
          if (!cancelled) setResult({ code, outcome: available ? 'available' : 'taken' })
        })
        .catch(() => {
          if (!cancelled) setResult({ code, outcome: 'error' })
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [code])

  const status = code.length < 3 ? null : result?.code === code ? result.outcome : 'checking'

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-school-code`}>School Code *</Label>
      <div className="relative">
        <Input
          id={`${idPrefix}-school-code`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="SCH-001"
          required
          className="pr-9"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'checking' && <Loader2 size={15} className="animate-spin text-[var(--muted-foreground)]" />}
          {status === 'available' && <CheckCircle2 size={15} className="text-green-600" />}
          {status === 'taken' && <XCircle size={15} className="text-[var(--destructive)]" />}
        </div>
      </div>
      {status === 'taken' && <p className="text-xs text-[var(--destructive)]">This code is already in use.</p>}
      {status === 'available' && <p className="text-xs text-green-600">Available</p>}
    </div>
  )
}
