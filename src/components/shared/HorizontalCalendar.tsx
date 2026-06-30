import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayMeta {
  date: string // YYYY-MM-DD
  dot?: 'green' | 'red' | 'amber' | 'none'
}

interface HorizontalCalendarProps {
  selectedDate: string // YYYY-MM-DD
  onSelectDate: (date: string) => void
  daysBack?: number
  daysForward?: number
  dayMeta?: DayMeta[]
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocal(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function shiftDate(dateStr: string, days: number): string {
  const d = parseLocal(dateStr)
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

const DOT_CLASS: Record<string, string> = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  none: 'bg-transparent',
}

export default function HorizontalCalendar({
  selectedDate,
  onSelectDate,
  daysBack = 30,
  daysForward = 7,
  dayMeta = [],
  className,
}: HorizontalCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = toLocalDateStr(new Date())
  const totalDays = daysBack + daysForward + 1

  const dates: string[] = Array.from({ length: totalDays }, (_, i) =>
    shiftDate(today, i - daysBack),
  )

  const metaMap = new Map(dayMeta.map((m) => [m.date, m]))

  // Scroll selected date into center on mount / when selectedDate changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = dates.indexOf(selectedDate)
    if (idx === -1) return
    const itemWidth = 56 + 8 // w-14 + gap-2 (approx)
    const target = idx * itemWidth - el.clientWidth / 2 + itemWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  const selectedD = parseLocal(selectedDate)
  const headerLabel = `${MONTHS[selectedD.getMonth()]} ${selectedD.getFullYear()}`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Month header + nav */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => onSelectDate(shiftDate(selectedDate, -1))}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-[var(--foreground)] flex-1 text-center">
          {headerLabel}
        </span>
        <button
          onClick={() => onSelectDate(shiftDate(selectedDate, 1))}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Scrollable date strip */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-7 flex items-center justify-center bg-gradient-to-r from-[var(--card)] to-transparent rounded-l-md"
        >
          <ChevronLeft size={13} className="text-[var(--muted-foreground)]" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-8 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {dates.map((d) => {
            const parsed = parseLocal(d)
            const dayName = DAYS[parsed.getDay()]
            const dayNum = parsed.getDate()
            const isSelected = d === selectedDate
            const isToday = d === today
            const meta = metaMap.get(d)

            return (
              <button
                key={d}
                onClick={() => onSelectDate(d)}
                className={cn(
                  'flex-shrink-0 w-14 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-colors',
                  isSelected
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]'
                    : isToday
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--foreground)]'
                    : 'border-[var(--border)] hover:bg-[var(--muted)]/50 text-[var(--foreground)]',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase',
                    isSelected
                      ? 'text-[var(--primary-foreground)]'
                      : 'text-[var(--muted-foreground)]',
                  )}
                >
                  {dayName}
                </span>
                <span className="text-sm font-bold leading-none">{dayNum}</span>
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    meta?.dot ? DOT_CLASS[meta.dot] : 'bg-transparent',
                  )}
                />
              </button>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-7 flex items-center justify-center bg-gradient-to-l from-[var(--card)] to-transparent rounded-r-md"
        >
          <ChevronRight size={13} className="text-[var(--muted-foreground)]" />
        </button>
      </div>
    </div>
  )
}
