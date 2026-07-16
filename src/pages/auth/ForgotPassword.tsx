import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { forgotPassword } from '@/lib/api/auth'
import { isAxiosError } from 'axios'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [resendCountdown, setResendCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (!submitted) return
    setResendCountdown(60)
    setCanResend(false)
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  const validate = () => {
    if (!email.trim()) { setEmailError('Email is required'); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); return false }
    setEmailError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const res = await forgotPassword(email)
      setDevOtp(res.devOtp || '')
      setSubmitted(true)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setEmailError('No account found with that email')
      } else {
        setEmailError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setCanResend(false)
    setResendCountdown(60)
    try {
      const res = await forgotPassword(email)
      setDevOtp(res.devOtp || '')
    } catch {
      // ignore — user can retry once the countdown ends
    }
    setCanResend(false)
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--background)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <div className="rounded-2xl p-8 shadow-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: 'var(--muted)' }}
                >
                  <Mail size={26} style={{ color: 'var(--primary)' }} />
                </div>

                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  Forgot Password?
                </h1>
                <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="admin@smarttrack.ae"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                      className={emailError ? 'border-red-400' : ''}
                    />
                    {emailError && (
                      <p className="flex items-center gap-1 text-xs mt-1 text-red-500">
                        <AlertCircle size={12} /> {emailError}
                      </p>
                    )}
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending…' : 'Send Reset Link'}
                  </Button>
                </form>

                <p className="text-center text-sm mt-5" style={{ color: 'var(--muted-foreground)' }}>
                  Remember your password?{' '}
                  <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(22,163,74,0.1)' }}
                >
                  <CheckCircle2 size={34} style={{ color: 'var(--success)' }} />
                </motion.div>

                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Check your email</h2>
                <p className="text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  We've sent a password reset link to
                </p>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{email}</p>
                <p className="text-xs mb-6" style={{ color: 'var(--muted-foreground)' }}>
                  The code will expire in 10 minutes. If you don't see it, check your spam folder.
                </p>

                {devOtp && (
                  <p className="text-xs mb-4 rounded-lg bg-[var(--muted)] p-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    Dev mode — your code is <span className="font-bold text-[var(--foreground)]">{devOtp}</span>
                  </p>
                )}

                <Button size="lg" className="w-full mb-3" onClick={() => navigate('/otp', { state: { email } })}>
                  Enter verification code
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canResend}
                  onClick={handleResend}
                  className="gap-2"
                >
                  <RefreshCw size={14} />
                  {canResend ? 'Resend Email' : `Resend in ${resendCountdown}s`}
                </Button>

                <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    <ArrowLeft size={14} />
                    Back to login
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
