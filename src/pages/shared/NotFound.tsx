import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bus, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--background)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="relative mb-6 inline-block">
          <div className="absolute inset-0 scale-150 rounded-full bg-[var(--primary)]/10 blur-2xl" />
          <div className="relative h-20 w-20 rounded-3xl bg-[var(--primary)] flex items-center justify-center shadow-xl mx-auto">
            <Bus size={40} className="text-white" />
          </div>
        </div>
        <p className="text-7xl font-extrabold text-[var(--primary)] mb-2">404</p>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Page not found</h1>
        <p className="text-[var(--muted-foreground)] max-w-sm mx-auto mb-8">
          The route you are looking for has taken a detour. Let us get you back on track.
        </p>
        <Link to="/">
          <Button size="lg"><Home size={16} /> Back to Home</Button>
        </Link>
      </motion.div>
    </div>
  )
}
