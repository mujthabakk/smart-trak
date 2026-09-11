import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Bus, Gauge, Navigation, Users } from 'lucide-react'

type MarkerStatus = 'running' | 'idle' | 'offline'

interface BusMarker {
  id: string
  label: string
  top: number
  left: number
  status: MarkerStatus
  speed: number
  eta: string
  occupancy: number
}

// Dummy fleet positions for the marketing preview — not real telemetry.
const MARKERS: BusMarker[] = [
  { id: 'a', label: 'BUS-12', top: 24, left: 18, status: 'running', speed: 34, eta: '6 min', occupancy: 28 },
  { id: 'b', label: 'BUS-07', top: 58, left: 66, status: 'running', speed: 41, eta: '3 min', occupancy: 22 },
  { id: 'c', label: 'BUS-21', top: 40, left: 46, status: 'idle', speed: 0, eta: '—', occupancy: 15 },
  { id: 'd', label: 'BUS-15', top: 76, left: 30, status: 'running', speed: 27, eta: '9 min', occupancy: 31 },
  { id: 'e', label: 'BUS-03', top: 18, left: 78, status: 'offline', speed: 0, eta: '—', occupancy: 0 },
  { id: 'f', label: 'BUS-09', top: 70, left: 10, status: 'running', speed: 38, eta: '4 min', occupancy: 19 },
]

const FOCUS_ID = 'b'

const STATUS_COLOR: Record<MarkerStatus, string> = {
  running: '#22c55e',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

function RoadMap() {
  return (
    <div className="absolute inset-0" style={{ background: '#e6eaf3' }}>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(#ccd5e8 1px, transparent 1px), linear-gradient(90deg, #ccd5e8 1px, transparent 1px)',
          backgroundSize: '9% 9%',
        }}
      />
      <div className="absolute rounded-[3rem] bg-emerald-200/50" style={{ top: '6%', left: '54%', width: '24%', height: '22%' }} />
      <div className="absolute rounded-full bg-emerald-200/40" style={{ top: '58%', left: '2%', width: '18%', height: '18%' }} />
      <div className="absolute bg-white" style={{ top: '34%', left: 0, right: 0, height: '10px' }} />
      <div className="absolute bg-white" style={{ top: 0, bottom: 0, left: '42%', width: '10px' }} />
      <div className="absolute bg-white" style={{ top: '72%', left: 0, right: 0, height: '7px' }} />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <polyline
          points="18,24 46,40 66,58"
          fill="none"
          stroke="#4b1e99"
          strokeOpacity={0.45}
          strokeWidth={0.6}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

export default function LiveMapPreview() {
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })

  const scale = useTransform(progress, [0, 0.65], [1, 2.7])
  const othersOpacity = useTransform(progress, [0, 0.35], [1, 0])
  const vignette = useTransform(progress, [0, 0.65], [0, 0.4])
  const cardOpacity = useTransform(progress, [0.55, 0.85], [0, 1])
  const cardY = useTransform(progress, [0.55, 0.85], [16, 0])
  const hintOpacity = useTransform(progress, [0, 0.15], [1, 0])

  const focus = MARKERS.find((m) => m.id === FOCUS_ID)!

  return (
    <section ref={trackRef} className="relative h-[240vh]">
      <div className="sticky top-20 h-[65vh] sm:h-[72vh] max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative h-full w-full overflow-hidden rounded-3xl border border-[var(--border)] shadow-sm bg-[#e6eaf3]">
          <motion.div className="absolute inset-0" style={{ scale, transformOrigin: `${focus.left}% ${focus.top}%` }}>
            <RoadMap />
            {MARKERS.map((m) => {
              const isFocus = m.id === FOCUS_ID
              return (
                <motion.div
                  key={m.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                  style={{ top: `${m.top}%`, left: `${m.left}%`, opacity: isFocus ? 1 : othersOpacity }}
                >
                  <div className="relative flex items-center justify-center">
                    {isFocus && (
                      <motion.span
                        className="absolute h-9 w-9 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[m.status] }}
                        animate={{ scale: [1, 2.4], opacity: [0.45, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                      />
                    )}
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: STATUS_COLOR[m.status] }}
                    >
                      <Bus size={13} className="text-white" />
                    </div>
                  </div>
                  <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-gray-700 shadow-sm">
                    {m.label}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: vignette,
              background: `radial-gradient(circle at ${focus.left}% ${focus.top}%, transparent 25%, rgba(10,10,20,0.55) 75%)`,
            }}
          />

          <motion.div
            className="absolute left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl"
            style={{ opacity: cardOpacity, y: cardY }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> {focus.label}
              </span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">On route</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Gauge size={14} className="mx-auto mb-0.5 text-[var(--primary)]" />
                <p className="text-xs font-bold text-[var(--foreground)]">{focus.speed} km/h</p>
              </div>
              <div>
                <Navigation size={14} className="mx-auto mb-0.5 text-[var(--primary)]" />
                <p className="text-xs font-bold text-[var(--foreground)]">ETA {focus.eta}</p>
              </div>
              <div>
                <Users size={14} className="mx-auto mb-0.5 text-[var(--primary)]" />
                <p className="text-xs font-bold text-[var(--foreground)]">{focus.occupancy} on board</p>
              </div>
            </div>
          </motion.div>

          <motion.div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-5" style={{ opacity: hintOpacity }}>
            <span className="rounded-full bg-[var(--card)]/90 border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] shadow-sm">
              Keep scrolling to zoom in on a live bus
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
