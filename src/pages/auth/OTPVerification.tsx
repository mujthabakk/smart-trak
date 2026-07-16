import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bus, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { verifyOtp, forgotPassword } from '@/lib/api/auth'
import { isAxiosError } from 'axios'

const OTP_LENGTH = 6

export default function OTPVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [seconds, setSeconds] = useState(45)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true })
  }, [email, navigate])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const handleChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, '')
    if (!v) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)))
      return
    }
    setError('')
    setDigits((prev) => {
      const next = [...prev]
      // support paste of full code
      if (v.length > 1) {
        v.split('').slice(0, OTP_LENGTH - index).forEach((char, k) => {
          next[index + k] = char
        })
        const lastFilled = Math.min(index + v.length, OTP_LENGTH - 1)
        inputsRef.current[lastFilled]?.focus()
        return next
      }
      next[index] = v
      if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus()
      return next
    })
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const code = digits.join('')

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code')
      return
    }
    if (!email) return
    setVerifying(true)
    try {
      await verifyOtp(email, code)
      navigate('/reset-password', { state: { email, otp: code } })
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        setError('Invalid or expired code. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) return
    setSeconds(45)
    setDigits(Array(OTP_LENGTH).fill(''))
    inputsRef.current[0]?.focus()
    try {
      await forgotPassword(email)
    } catch {
      // ignore — user can request again once the countdown ends
    }
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
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <ShieldCheck size={28} className="text-[var(--primary)]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--foreground)' }}>
            Verify your identity
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--muted-foreground)' }}>
            We sent a 6-digit code to your registered email. Enter it below.
          </p>

          <div className="flex justify-center gap-2 sm:gap-3 mb-2">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={cn(
                  'h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 text-center text-xl font-bold transition-all outline-none',
                  'bg-[var(--input)] text-[var(--foreground)]',
                  error ? 'border-[var(--destructive)]' : digit ? 'border-[var(--primary)]' : 'border-[var(--border)]',
                  'focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30',
                )}
              />
            ))}
          </div>

          {error && <p className="text-xs text-center text-red-500 mb-2">{error}</p>}

          <Button onClick={handleVerify} size="lg" className="w-full mt-4" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify Code'}
          </Button>

          <div className="mt-5 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {seconds > 0 ? (
              <span>
                Resend code in <span className="font-semibold text-[var(--foreground)]">{seconds}s</span>
              </span>
            ) : (
              <button
                onClick={handleResendCode}
                className="font-medium hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                Resend code
              </button>
            )}
          </div>
        </div>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ArrowLeft size={15} />
          Back to login
        </Link>
      </motion.div>
    </div>
  )
}
