import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, RotateCcw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { allStudents, allBuses, allDrivers, mockAttendance, allLeaves } from '@/lib/mockData'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

const QUICK_PROMPTS = [
  'How many students are present today?',
  'Which buses are running now?',
  'How many leaves are pending?',
  'What is today\'s attendance rate?',
  'List all active buses',
]

function getLocalTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function generateResponse(query: string): string {
  const q = query.toLowerCase()

  const totalStudents = allStudents.length
  const activeStudents = allStudents.filter((s) => s.is_active).length
  const presentToday = mockAttendance.filter((a) => a.status === 'present').length
  const absentToday = mockAttendance.filter((a) => a.status === 'absent').length
  const onLeave = mockAttendance.filter((a) => a.status === 'leave').length
  const attendancePct = mockAttendance.length
    ? Math.round((presentToday / mockAttendance.length) * 100)
    : 0

  const runningBuses = allBuses.filter((b) => b.status === 'running')
  const idleBuses = allBuses.filter((b) => b.status === 'idle')
  const offlineBuses = allBuses.filter((b) => !b.status || b.status === 'offline')
  const pendingLeaves = allLeaves.filter((l) => l.school_id === 'sch_001' && l.status === 'pending')
  const activeDrivers = allDrivers.filter((d) => d.is_active)

  if (q.includes('present') || q.includes('attendance')) {
    return `📊 **Today's Attendance Summary**\n\n• Present: **${presentToday}** students\n• Absent: **${absentToday}** students\n• On Leave: **${onLeave}** students\n• Attendance Rate: **${attendancePct}%**\n\nTotal enrolled students: ${totalStudents} (${activeStudents} active)`
  }

  if (q.includes('bus') && (q.includes('running') || q.includes('active') || q.includes('now'))) {
    const names = runningBuses.map((b) => `  • ${b.bus_number} — ${b.driver_name ?? 'No driver'}`).join('\n')
    return `🚌 **Currently Running Buses (${runningBuses.length})**\n\n${names || '  No buses currently running'}\n\n⏸ Idle: ${idleBuses.length} | 📵 Offline: ${offlineBuses.length}`
  }

  if (q.includes('bus')) {
    return `🚌 **Fleet Overview**\n\n• Total buses: **${allBuses.length}**\n• Running: **${runningBuses.length}**\n• Idle: **${idleBuses.length}**\n• Offline: **${offlineBuses.length}**`
  }

  if (q.includes('leave') || q.includes('absent') || q.includes('pending')) {
    const names = pendingLeaves.slice(0, 3).map((l) => {
      const s = allStudents.find((s) => s.id === l.student_id)
      return `  • ${s?.name ?? 'Student'} — ${l.from_date} to ${l.to_date}`
    }).join('\n')
    return `📋 **Leave Requests**\n\n• Pending: **${pendingLeaves.length}** requests\n• Approved this month: ${allLeaves.filter((l) => l.status === 'approved').length}\n\nPending requests:\n${names || '  None pending'}`
  }

  if (q.includes('driver')) {
    return `👤 **Drivers Summary**\n\n• Total drivers: **${allDrivers.length}**\n• Active: **${activeDrivers.length}**\n• Inactive: **${allDrivers.length - activeDrivers.length}**`
  }

  if (q.includes('student')) {
    return `🎒 **Students Summary**\n\n• Total students: **${totalStudents}**\n• Active: **${activeStudents}**\n• Present today: **${presentToday}**\n• Absent today: **${absentToday}**`
  }

  if (q.includes('rate') || q.includes('percent') || q.includes('%')) {
    return `📈 **Attendance Rate**\n\nToday's rate: **${attendancePct}%**\n\n${presentToday} out of ${mockAttendance.length} students scanned are present.`
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `👋 Hello! I'm your SmartTrack assistant. I can help you with:\n\n• Attendance summaries\n• Bus & fleet status\n• Student information\n• Leave requests\n• Driver details\n\nWhat would you like to know?`
  }

  return `I can help you with attendance, buses, students, drivers, and leave requests. Try asking:\n\n• "How many students are present today?"\n• "Which buses are running?"\n• "How many leaves are pending?"\n• "What is the attendance rate?"`
}

function formatContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-bold text-[var(--foreground)] mb-1">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.includes('**')) {
      const parts = line.split('**')
      return (
        <p key={i} className="text-sm text-[var(--foreground)] leading-relaxed">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        </p>
      )
    }
    if (line.startsWith('•')) {
      return <p key={i} className="text-sm text-[var(--muted-foreground)] ml-2 leading-relaxed">{line}</p>
    }
    if (line === '') return <div key={i} className="h-1" />
    return <p key={i} className="text-sm text-[var(--foreground)] leading-relaxed">{line}</p>
  })
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I\'m your SmartTrack AI assistant. Ask me anything about your school\'s buses, students, attendance, or drivers.',
  time: getLocalTime(),
}

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q) return
    setInput('')
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: q, time: getLocalTime() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setTimeout(() => {
      const reply = generateResponse(q)
      setMessages((prev) => [...prev, { id: `a_${Date.now()}`, role: 'assistant', content: reply, time: getLocalTime() }])
      setLoading(false)
    }, 600)
  }

  function reset() {
    setMessages([WELCOME])
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        <Sparkles size={22} />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--primary)] text-[var(--primary-foreground)]">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">SmartTrack Assistant</p>
                <p className="text-xs text-white/70">AI-powered school data queries</p>
              </div>
              <button onClick={reset} title="Reset chat" className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[380px]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={13} className="text-[var(--primary)]" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-3 py-2 max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-sm'
                      : 'bg-[var(--muted)]/60 border border-[var(--border)] rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant'
                      ? <div className="space-y-0.5">{formatContent(msg.content)}</div>
                      : <p className="text-sm">{msg.content}</p>
                    }
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-[var(--muted-foreground)]'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={13} className="text-[var(--primary)]" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-[var(--muted)]/60 border border-[var(--border)] px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} className="h-2 w-2 rounded-full bg-[var(--primary)]/60"
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-4 py-2 border-t border-[var(--border)] flex gap-2 overflow-x-auto scrollbar-none">
              {QUICK_PROMPTS.slice(0, 3).map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="text-[11px] whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-1 text-[var(--muted-foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors flex-shrink-0">
                  {p}
                </button>
              ))}
              <button
                className="text-[11px] whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors flex-shrink-0 flex items-center gap-1"
                onClick={() => {
                  const next = QUICK_PROMPTS.slice(3)
                  if (next.length > 0) send(next[Math.floor(Math.random() * next.length)])
                }}>
                More <ChevronDown size={10} />
              </button>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about buses, students…"
                className="flex-1 text-sm h-9"
              />
              <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => send()} disabled={!input.trim() || loading}>
                <Send size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIAssistant
