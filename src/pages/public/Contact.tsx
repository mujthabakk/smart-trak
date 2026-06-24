import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Globe, Clock, Send, CheckCircle2, Sparkles, Building2 } from 'lucide-react'
import PublicLayout from '@/components/layout/PublicLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CONTACT_INFO, SUPPORT_TOPICS, OFFICES } from '@/lib/siteContent'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0])

  const details = [
    { icon: Mail, label: 'Email', value: CONTACT_INFO.email },
    { icon: Phone, label: 'Phone', value: CONTACT_INFO.phone },
    { icon: Globe, label: 'Website', value: CONTACT_INFO.website },
    { icon: Clock, label: 'Hours', value: CONTACT_INFO.hours },
  ]

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-3 uppercase tracking-wider">
            <Sparkles size={12} /> Contact
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] leading-tight">Get in touch</h1>
          <p className="mt-3 text-lg text-[var(--muted-foreground)]">Questions, demos or support — the SmartTrack team by Akira Software Solutions is here to help.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Reach us</h3>
              <div className="space-y-4">
                {details.map((d) => {
                  const Icon = d.icon
                  return (
                    <div key={d.label} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--muted-foreground)]">{d.label}</p>
                        <p className="text-sm font-medium text-[var(--foreground)] break-words">{d.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)))' }}>
              <h3 className="font-semibold mb-1">Prefer a live demo?</h3>
              <p className="text-sm text-white/80">Pick “Request a demo” in the form and we’ll schedule a walkthrough of the full platform.</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7">
              {sent ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-10">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <CheckCircle2 size={34} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">Message sent!</h3>
                  <p className="text-[var(--muted-foreground)] mb-6">Thanks for reaching out. Our team will reply within one business day.</p>
                  <Button variant="outline" onClick={() => setSent(false)}>Send another message</Button>
                </motion.div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-name">Full name</Label>
                      <Input id="c-name" required placeholder="Your name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-email">Email</Label>
                      <Input id="c-email" type="email" required placeholder="you@school.ae" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-phone">Phone</Label>
                      <Input id="c-phone" placeholder="+971 50 000 0000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Topic</Label>
                      <Select value={topic} onValueChange={setTopic}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SUPPORT_TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-msg">Message</Label>
                    <Textarea id="c-msg" required rows={5} placeholder="How can we help?" />
                  </div>
                  <Button type="submit" size="lg" className="w-full">Send Message <Send size={16} /></Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Offices */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-[var(--foreground)] text-center mb-2">Our offices</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8">Akira Software Solutions — serving schools across three regions.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {OFFICES.map((o) => (
              <motion.div key={o.country} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{o.flag}</span>
                  <h3 className="font-semibold text-[var(--foreground)]">{o.country}</h3>
                </div>
                <div className="flex items-start gap-2 mb-3">
                  <Building2 size={15} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-[var(--foreground)]">{o.entity}</p>
                </div>
                <div className="space-y-0.5 text-sm text-[var(--muted-foreground)] mb-3 pl-[23px]">
                  {o.lines.map((l) => <p key={l}>{l}</p>)}
                </div>
                <div className="flex items-center gap-2 pl-[23px]">
                  <Phone size={14} className="text-[var(--muted-foreground)]" />
                  <a href={`tel:${o.phone.replace(/\s/g, '')}`} className="text-sm text-[var(--primary)] font-medium">{o.phone}</a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
