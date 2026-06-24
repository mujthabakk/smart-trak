import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Bus, AlertCircle, Mail, Lock, ArrowRight, Shield, School,
  Users, UserPlus, Smartphone, MapPin, QrCode, Bell, Route, CheckCircle2, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { WEB_ACCOUNTS, MOBILE_ACCOUNTS, findDemoAccount } from '@/lib/demoAccounts'
import type { DemoAccount } from '@/lib/demoAccounts'
import type { UserRole } from '@/store/authStore'
import { getRoleLabel, cn } from '@/lib/utils'

const ROLE_ICON: Record<UserRole, typeof Shield> = {
  super_admin: Shield,
  school_admin: School,
  driver: Bus,
  guest_driver: UserPlus,
  parent: Users,
}

const ROLE_TINT: Record<UserRole, string> = {
  super_admin: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  school_admin: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  driver: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  guest_driver: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  parent: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
}

const FEATURES = [
  { icon: MapPin, label: 'Real-time GPS Tracking' },
  { icon: QrCode, label: 'QR Attendance System' },
  { icon: Bell, label: 'Instant Push Alerts' },
  { icon: Route, label: 'Smart Route Management' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function doLogin(acct: DemoAccount) {
    login(
      {
        id: `${acct.role}-${acct.email}`,
        email: acct.email,
        name: acct.name,
        role: acct.role,
        phone: acct.phone,
        school_id: acct.school_id,
        school_name: acct.school_name,
      },
      `demo-${acct.role}-token`,
    )
    navigate(acct.role === 'super_admin' ? '/super-admin/dashboard' : '/school-admin/dashboard', { replace: true })
  }

  async function quickLogin(acct: DemoAccount) {
    setError('')
    setInfo('')
    setEmail(acct.email)
    setPassword(acct.password)
    if (acct.panel === 'mobile') {
      setInfo(`The ${getRoleLabel(acct.role)} role lives in the SmartTrack mobile app. Credentials are filled so you can see them — the web console covers Super Admin & School Admin.`)
      return
    }
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    doLogin(acct)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    const acct = findDemoAccount(email, password)
    if (!acct) {
      setIsLoading(false)
      setError('Invalid credentials. Use one of the demo accounts below.')
      return
    }
    if (acct.panel === 'mobile') {
      setIsLoading(false)
      setInfo(`The ${getRoleLabel(acct.role)} role is served by the SmartTrack mobile app, not the web console.`)
      return
    }
    doLogin(acct)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* ───────── Left brand panel ───────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, var(--sidebar-bg) 0%, var(--primary) 130%)' }}
      >
        {[
          { size: 'w-[28rem] h-[28rem]', pos: '-top-32 -right-32', delay: 0 },
          { size: 'w-72 h-72', pos: 'bottom-0 -left-20', delay: 1 },
          { size: 'w-52 h-52', pos: 'top-1/2 left-1/4', delay: 0.5 },
        ].map((c, i) => (
          <motion.div
            key={i}
            className={cn('absolute rounded-full opacity-10', c.size, c.pos)}
            style={{ background: 'var(--primary-foreground)' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: c.delay }}
          />
        ))}

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <Bus size={24} color="white" />
          </div>
          <span className="text-2xl font-bold text-white">SmartTrack</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Every journey tracked.<br />Every child safe.
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.72)' }}>
            The enterprise platform for school bus fleets — live tracking, QR attendance, and instant parent alerts.
          </p>

          {/* Glass mini-widget */}
          <div className="rounded-2xl p-4 mb-8 backdrop-blur-md border border-white/15" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Live Fleet</span>
              <span className="flex items-center gap-1.5 text-xs text-white/80">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> 18 active
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><Bus size={18} color="white" /></div>
              <div className="flex-1">
                <div className="h-2 w-3/4 rounded-full bg-white/40 mb-1.5" />
                <div className="h-2 w-1/2 rounded-full bg-white/25" />
              </div>
              <span className="text-xs font-semibold text-white">ETA 8m</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon size={14} color="white" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>© 2026 SmartTrack · v1.1</p>
      </div>

      {/* ───────── Right form panel ───────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md py-6"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <Bus size={20} color="white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>SmartTrack</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Sign in to your SmartTrack console</p>

          {/* Banners */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
                style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--destructive)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
              </motion.div>
            )}
            {info && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/20"
              >
                <Info size={16} className="flex-shrink-0 mt-0.5" /> {info}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <Input type="email" placeholder="you@school.ae" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: 'var(--muted-foreground)' }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-[var(--primary)]" />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium hover:underline" style={{ color: 'var(--primary)' }}>Forgot Password?</Link>
            </div>

            <Button type="submit" size="lg" className="w-full mt-1" loading={isLoading}>
              {isLoading ? 'Signing in…' : <>Sign In <ArrowRight size={16} /></>}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>One-click demo access</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {WEB_ACCOUNTS.map((acct) => {
                const Icon = ROLE_ICON[acct.role]
                return (
                  <button
                    key={acct.email}
                    onClick={() => quickLogin(acct)}
                    disabled={isLoading}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left transition-all hover:border-[var(--primary)]/50 hover:shadow-sm disabled:opacity-60"
                  >
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', ROLE_TINT[acct.role])}>
                      <Icon size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {getRoleLabel(acct.role)}
                        {acct.school_name && <span className="font-normal text-[var(--muted-foreground)]"> · {acct.school_name}</span>}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">{acct.email} · {acct.password}</p>
                    </div>
                    <ArrowRight size={15} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* Mobile roles */}
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Smartphone size={13} className="text-[var(--muted-foreground)]" />
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Mobile app roles</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOBILE_ACCOUNTS.map((acct) => {
                  const Icon = ROLE_ICON[acct.role]
                  return (
                    <button
                      key={acct.email}
                      onClick={() => quickLogin(acct)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-colors"
                    >
                      <Icon size={12} className="text-[var(--muted-foreground)]" />
                      {getRoleLabel(acct.role)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            New school?{' '}
            <Link to="/onboarding" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>Get started</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
