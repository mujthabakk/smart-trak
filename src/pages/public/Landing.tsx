import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Sparkles, Star, Users, Shield, UserCheck, GraduationCap } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  HERO, SMART_PRO, SMART_FEATURES, FUNCTIONALITIES, SITE_STATS,
  PARENT_BENEFITS, ADMIN_BENEFITS, ASSISTANT_BENEFITS, HOW_STEPS,
} from '@/lib/siteContent'
import type { Benefit } from '@/lib/siteContent'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const TAB_ICON: Record<string, typeof Users> = { basic: Sparkles, parent: Users, admin: Shield, assistant: UserCheck }

function SectionHeading({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-3 uppercase tracking-wider">
        <Sparkles size={12} /> {tag}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] leading-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-[var(--muted-foreground)] text-lg">{subtitle}</p>}
    </motion.div>
  )
}

function BenefitGrid({ items }: { items: Benefit[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((b) => {
        const Icon = b.icon
        return (
          <motion.div key={b.title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-lg hover:border-[var(--primary)]/40 transition-all">
            <div className="h-12 w-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Icon size={22} className="text-[var(--primary)]" />
            </div>
            <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{b.title}</h3>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{b.desc}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <PublicLayout>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(60% 60% at 85% 0%, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 100%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] mb-5">
              <Star size={12} className="text-amber-400 fill-amber-400" /> Award-winning school transport platform
            </span>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-[var(--foreground)] leading-[1.05] tracking-tight">
              Real-Time School Bus <span className="text-[var(--primary)]">Tracking System</span>
            </h1>
            <p className="mt-5 text-lg text-[var(--muted-foreground)] max-w-xl leading-relaxed">{HERO.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="secondary" onClick={() => navigate('/onboarding')}>{HERO.primaryCta} <ArrowRight size={16} /></Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>{HERO.secondaryCta}</Button>
            </div>
            <p className="mt-4 text-sm text-[var(--muted-foreground)] flex items-center gap-1.5"><CheckCircle2 size={15} className="text-green-500" /> {HERO.demoNote}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative flex justify-center">
            <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 blur-3xl" />
            <img src="/app/login.png" alt="SmartTrack app" className="relative w-64 sm:w-72 drop-shadow-2xl" />
          </motion.div>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="border-y border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {SITE_STATS.map((s) => (
            <motion.div key={s.label} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-[var(--primary)]">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── SMART TRACK PRO ───────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-3 uppercase tracking-wider"><Sparkles size={12} /> Overview</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-4">{SMART_PRO.heading}</h2>
          <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">{SMART_PRO.body}</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/pricing')}>Read More <ArrowRight size={16} /></Button>
        </motion.div>
      </section>

      {/* ───────── SMART FEATURES ───────── */}
      <section id="features" className="bg-[var(--card)] border-y border-[var(--border)] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <SectionHeading tag="Smart Features" title="Everything in one smart platform" subtitle="The core tools that keep schools, parents and drivers in sync." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SMART_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ delay: (i % 3) * 0.05 }}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 hover:shadow-lg hover:border-[var(--primary)]/40 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--primary)] transition-colors">
                    <Icon size={22} className="text-[var(--primary)] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── SMART FUNCTIONALITIES (role tabs) ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading tag="Smart Functionalities" title="Built for every role" subtitle="One platform, tailored experiences for basics, parents, admins and assistants." />
        <Tabs defaultValue="basic" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="flex-wrap h-auto">
              {FUNCTIONALITIES.map((t) => {
                const Icon = TAB_ICON[t.key] ?? Sparkles
                return <TabsTrigger key={t.key} value={t.key} className="gap-1.5"><Icon size={15} /> {t.label}</TabsTrigger>
              })}
            </TabsList>
          </div>
          {FUNCTIONALITIES.map((t) => (
            <TabsContent key={t.key} value={t.key}>
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div className="flex justify-center order-2 lg:order-1">
                  <div className="relative">
                    <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-[var(--primary)]/15 to-[var(--secondary)]/15 blur-2xl" />
                    <img src={t.screen} alt={`${t.label} view`} className="relative w-56 drop-shadow-2xl" />
                  </div>
                </div>
                <div className="order-1 lg:order-2 space-y-4">
                  {t.points.map((p) => (
                    <div key={p.title} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 size={17} className="text-[var(--primary)]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[var(--foreground)]">{p.title}</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* ───────── BENEFITS: PARENT ───────── */}
      <section className="bg-[var(--card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <SectionHeading tag="For Parents" title="Peace of mind, every trip" />
          <BenefitGrid items={PARENT_BENEFITS} />
        </div>
      </section>

      {/* ───────── BENEFITS: ADMIN ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading tag="For School Admins" title="Run your whole fleet with ease" />
        <BenefitGrid items={ADMIN_BENEFITS} />
      </section>

      {/* ───────── BENEFITS: ASSISTANT ───────── */}
      <section className="bg-[var(--card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <SectionHeading tag="For Drivers & Assistants" title="Safer, simpler journeys" />
          <BenefitGrid items={ASSISTANT_BENEFITS} />
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading tag="How It Works" title="Up and running in three steps" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div key={s.title} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ delay: i * 0.06 }}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center mb-4">
                  <Icon size={24} className="text-white" />
                </div>
                <span className="absolute top-5 right-6 text-3xl font-extrabold text-[var(--primary)]/15">{i + 1}</span>
                <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{s.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{s.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto rounded-3xl px-8 py-14 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--secondary)) 100%)' }}>
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={18} className="text-amber-300 fill-amber-300" />)}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Simplify school transport today</h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">Get a free demo and see why schools choose SmartTrack to keep every child safe.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" onClick={() => navigate('/onboarding')}>{HERO.primaryCta} <ArrowRight size={16} /></Button>
              <Button size="lg" className="bg-white/15 text-white hover:bg-white/25 border border-white/30" onClick={() => navigate('/contact')}>Get In Touch</Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
