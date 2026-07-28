import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'MMM dd, yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    // Accept preset aliases for convenience
    const presets: Record<string, string> = {
      short: 'MMM dd, yyyy',
      long: 'EEEE, MMMM dd, yyyy',
      time: 'hh:mm a',
      datetime: 'MMM dd, yyyy hh:mm a',
      relative: '',
    }
    const resolvedFmt = presets[fmt] !== undefined ? presets[fmt] : fmt
    if (fmt === 'relative') {
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (minutes < 1) return 'just now'
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return format(d, 'MMM dd')
    }
    return format(d, resolvedFmt || 'MMM dd, yyyy')
  } catch {
    return '—'
  }
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function generateRandomId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length >= 10) {
    const country = cleaned.slice(0, cleaned.length - 10)
    const area = cleaned.slice(-10, -7)
    const prefix = cleaned.slice(-7, -4)
    const line = cleaned.slice(-4)
    return `+${country} ${area} ${prefix}-${line}`
  }
  return phone
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-green-600 bg-green-50',
    inactive: 'text-gray-500 bg-gray-100',
    pending: 'text-yellow-600 bg-yellow-50',
    approved: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
    suspended: 'text-orange-600 bg-orange-50',
    running: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    not_started: 'text-gray-500 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-50',
    open: 'text-blue-600 bg-blue-50',
    resolved: 'text-green-600 bg-green-50',
    escalated: 'text-red-600 bg-red-50',
    present: 'text-green-600 bg-green-50',
    absent: 'text-red-600 bg-red-50',
    leave: 'text-yellow-600 bg-yellow-50',
    expired: 'text-red-600 bg-red-50',
    trial: 'text-purple-600 bg-purple-50',
    reported: 'text-orange-600 bg-orange-50',
    claimed: 'text-blue-600 bg-blue-50',
    initiated: 'text-blue-600 bg-blue-50',
    pending_approval: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  }
  return map[status] ?? 'text-gray-600 bg-gray-100'
}

export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    driver: 'Driver',
    guest_driver: 'Guest Driver',
    parent: 'Parent',
  }
  return map[role] ?? role
}

export function getPlanBadgeColor(plan: string): string {
  const map: Record<string, string> = {
    basic: 'text-gray-600 bg-gray-100',
    standard: 'text-blue-600 bg-blue-50',
    premium: 'text-purple-600 bg-purple-50',
  }
  return map[plan?.toLowerCase()] ?? 'text-gray-600 bg-gray-100'
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function daysUntil(date: string): number {
  const target = new Date(date)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export function isExpiringSoon(date: string, days = 30): boolean {
  return daysUntil(date) <= days
}

export function avatarColorFromName(name: string): string {
  const colors = [
    'bg-primary text-primary-foreground',
    'bg-blue-500 text-white',
    'bg-green-500 text-white',
    'bg-purple-500 text-white',
    'bg-orange-500 text-white',
    'bg-pink-500 text-white',
    'bg-teal-500 text-white',
    'bg-indigo-500 text-white',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}
