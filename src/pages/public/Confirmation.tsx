import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Mail, MessageCircle, Clock, ArrowRight, Home } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'

const NEXT = [
  { icon: Mail, title: 'Check your email', desc: 'We’ll send your console URL and temporary login once approved.' },
  { icon: MessageCircle, title: 'Check WhatsApp', desc: 'The same credentials are delivered to your contact number.' },
  { icon: Clock, title: 'Approval', desc: 'A Super Admin reviews your application — usually within a few hours.' },
]

export default function Confirmation() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="relative inline-block mb-6">
          <div className="absolute inset-0 scale-150 rounded-full bg-green-500/15 blur-2xl" />
          <div className="relative h-20 w-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg mx-auto">
            <CheckCircle2 size={42} className="text-white" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] mb-3">Application submitted!</h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-md mx-auto">
            Thank you for choosing SmartTrack. Your school registration has been received and is pending approval.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {NEXT.map((n, i) => {
            const Icon = n.icon
            return (
              <motion.div key={n.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left">
                <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-3"><Icon size={18} className="text-[var(--primary)]" /></div>
                <p className="font-semibold text-[var(--foreground)] text-sm mb-1">{n.title}</p>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{n.desc}</p>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/"><Button variant="outline"><Home size={16} /> Back to Home</Button></Link>
          <Link to="/login"><Button>Go to Login <ArrowRight size={16} /></Button></Link>
        </div>

        <p className="mt-8 text-sm text-[var(--muted-foreground)]">
          Didn’t receive anything? <Link to="/contact" className="text-[var(--primary)] font-medium hover:underline">Contact support</Link>
        </p>
      </div>
    </PublicLayout>
  )
}
