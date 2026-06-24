import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bus, Eye, EyeOff, Check, X, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Criterion {
  label: string
  test: (pw: string) => boolean
}

const CRITERIA: Criterion[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /\d/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)

  const passed = useMemo(() => CRITERIA.filter((c) => c.test(password)).length, [password])
  const strength = (passed / CRITERIA.length) * 100
  const strengthLabel = passed <= 2 ? 'Weak' : passed <= 4 ? 'Good' : 'Strong'
  const strengthColor = passed <= 2 ? 'bg-red-500' : passed <= 4 ? 'bg-amber-500' : 'bg-green-500'

  const match = password.length > 0 && password === confirm
  const canSubmit = passed === CRITERIA.length && match

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 1800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Bus size={20} color="white" />
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>SmartTrack</span>
        </div>

        <div className="rounded-2xl p-8 shadow-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-6"
            >
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Password reset!</h1>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Your password has been updated. Redirecting you to sign in…
              </p>
            </motion.div>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                  <KeyRound size={28} className="text-[var(--primary)]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--foreground)' }}>
                Create new password
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: 'var(--muted-foreground)' }}>
                Your new password must be different from previous ones.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>New Password</label>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Strength</span>
                        <span className={cn('text-xs font-medium', passed <= 2 ? 'text-red-500' : passed <= 4 ? 'text-amber-500' : 'text-green-500')}>
                          {strengthLabel}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                        <motion.div className={cn('h-full rounded-full', strengthColor)} animate={{ width: `${strength}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={cn('pr-10', confirm && !match && 'border-red-400')}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirm && !match && <p className="text-xs mt-1 text-red-500">Passwords do not match</p>}
                </div>

                {/* Criteria checklist */}
                <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-[var(--muted)]/50 p-3">
                  {CRITERIA.map((c) => {
                    const ok = c.test(password)
                    return (
                      <div key={c.label} className="flex items-center gap-2 text-xs">
                        <span className={cn('h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0', ok ? 'bg-green-500' : 'bg-[var(--border)]')}>
                          {ok ? <Check size={10} className="text-white" strokeWidth={3} /> : <X size={10} className="text-[var(--muted-foreground)]" />}
                        </span>
                        <span style={{ color: ok ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{c.label}</span>
                      </div>
                    )
                  })}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>

        {!done && (
          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ArrowLeft size={15} />
            Back to login
          </Link>
        )}
      </motion.div>
    </div>
  )
}
