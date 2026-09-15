import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Clock, BookOpen, X } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { listTraining } from '@/lib/api/training'
import type { TrainingModule } from '@/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function getEmbedUrl(url: string): string {
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return url
}

export default function Training() {
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerModule, setPlayerModule] = useState<TrainingModule | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['training', 'school_admin'],
    queryFn: () => listTraining({ target_role: 'school_admin', pageSize: 200 }),
  })
  const modules = data?.trainingModules ?? []

  function openPlayer(m: TrainingModule) {
    setPlayerModule(m)
    setPlayerOpen(true)
  }

  return (
    <Layout>
      <PageHeader title="Training Centre" subtitle="Video tutorials and resources from SmartTrack" />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {isError ? (
          <motion.div variants={item}>
            <EmptyState icon={BookOpen} title="Failed to load" description="Could not load training videos. Please try again." />
          </motion.div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : modules.length === 0 ? (
          <motion.div variants={item}>
            <EmptyState icon={BookOpen} title="No training videos yet" description="Check back later for tutorials and resources." />
          </motion.div>
        ) : (
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {modules.map((m) => (
              <motion.div
                key={m.id}
                variants={item}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div
                  className="relative aspect-video bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center cursor-pointer"
                  onClick={() => openPlayer(m)}
                >
                  <div className="h-14 w-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white fill-white ml-0.5" />
                  </div>
                  {m.duration_mins !== undefined && (
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                      {m.duration_mins} min
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-[var(--foreground)] leading-snug mb-1">{m.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-2 mb-3">{m.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-[var(--border)]">
                    {m.duration_mins !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock size={13} /> {m.duration_mins}m
                      </span>
                    ) : <span />}
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs" onClick={() => openPlayer(m)}>
                      <Play size={13} className="fill-current" /> Watch
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0 pr-4">
              <h2 className="font-semibold text-[var(--foreground)] truncate">{playerModule?.title}</h2>
              <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{playerModule?.description}</p>
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setPlayerOpen(false)}>
              <X size={16} />
            </Button>
          </div>
          <div className="aspect-video w-full bg-black">
            {playerModule?.video_url && (
              <iframe
                src={getEmbedUrl(playerModule.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={playerModule.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
