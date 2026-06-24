import type { Theme } from '@/types'

export const THEMES: Array<{
  id: Theme
  name: string
  label: string
  primary: string
  secondary: string
  preview: string[]
  description: string
}> = [
  {
    id: 'electric',
    name: 'electric',
    label: 'Electric',
    primary: '#5929fe',
    secondary: '#fcbe0f',
    preview: ['#5929fe', '#fcbe0f', '#f3f0ff'],
    description: 'Bold purple & gold',
  },
  {
    id: 'royal',
    name: 'royal',
    label: 'Royal Blue',
    primary: '#1a4fdb',
    secondary: '#38bdf8',
    preview: ['#1a4fdb', '#38bdf8', '#eff6ff'],
    description: 'Classic blue & sky',
  },
  {
    id: 'forest',
    name: 'forest',
    label: 'Forest',
    primary: '#16a34a',
    secondary: '#4ade80',
    preview: ['#16a34a', '#4ade80', '#f0fdf4'],
    description: 'Fresh green & lime',
  },
  {
    id: 'crimson',
    name: 'crimson',
    label: 'Crimson',
    primary: '#c41c1c',
    secondary: '#f97316',
    preview: ['#c41c1c', '#f97316', '#fff1f2'],
    description: 'Bold red & orange',
  },
  {
    id: 'midnight',
    name: 'midnight',
    label: 'Midnight',
    primary: '#3730a3',
    secondary: '#818cf8',
    preview: ['#3730a3', '#818cf8', '#eef2ff'],
    description: 'Deep indigo & violet',
  },
  {
    id: 'ocean',
    name: 'ocean',
    label: 'Ocean Teal',
    primary: '#0f766e',
    secondary: '#2dd4bf',
    preview: ['#0f766e', '#2dd4bf', '#f0fdfa'],
    description: 'Teal & turquoise',
  },
]

// ─── Roles ─────────────────────────────────────────────────────────────────────

export const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'school_admin', label: 'School Admin' },
  { value: 'driver', label: 'Driver' },
  { value: 'guest_driver', label: 'Guest Driver' },
  { value: 'parent', label: 'Parent' },
]

// ─── Status Colors ─────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
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

// ─── Sidebar Nav ───────────────────────────────────────────────────────────────

export const SIDEBAR_NAV: Record<
  'super_admin' | 'school_admin',
  Array<{ label: string; path: string; icon: string; badge?: number }>
> = {
  super_admin: [
    { label: 'Dashboard', path: '/super-admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Schools', path: '/super-admin/schools', icon: 'School' },
    { label: 'Subscriptions', path: '/super-admin/subscriptions', icon: 'CreditCard' },
    { label: 'Plans', path: '/super-admin/plans', icon: 'Package' },
    { label: 'Bulk Messaging', path: '/super-admin/bulk-messaging', icon: 'MessageSquare' },
    { label: 'Support Tickets', path: '/super-admin/support', icon: 'LifeBuoy' },
    { label: 'Users', path: '/super-admin/users', icon: 'Users' },
    { label: 'Training Centre', path: '/super-admin/training', icon: 'BookOpen' },
    { label: 'Reports', path: '/super-admin/reports', icon: 'BarChart3' },
    { label: 'Settings', path: '/super-admin/settings', icon: 'Settings' },
  ],
  school_admin: [
    { label: 'Dashboard', path: '/school-admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Students', path: '/school-admin/students', icon: 'GraduationCap' },
    { label: 'Drivers', path: '/school-admin/drivers', icon: 'UserCheck' },
    { label: 'Buses', path: '/school-admin/buses', icon: 'Bus' },
    { label: 'Routes', path: '/school-admin/routes', icon: 'Route' },
    { label: 'Live Map', path: '/school-admin/live-map', icon: 'Map' },
    { label: 'Attendance', path: '/school-admin/attendance', icon: 'CalendarCheck' },
    { label: 'Leave Management', path: '/school-admin/leave', icon: 'CalendarOff' },
    { label: 'Notifications', path: '/school-admin/notifications', icon: 'Bell' },
    { label: 'Lost & Found', path: '/school-admin/lost-found', icon: 'Package' },
    { label: 'Bus Transfer', path: '/school-admin/bus-transfer', icon: 'ArrowLeftRight' },
    { label: 'Guest Drivers', path: '/school-admin/guest-drivers', icon: 'UserPlus' },
    { label: 'Support', path: '/school-admin/support', icon: 'LifeBuoy' },
    { label: 'Reports', path: '/school-admin/reports', icon: 'BarChart3' },
    { label: 'Settings', path: '/school-admin/settings', icon: 'Settings' },
  ],
}

// ─── Legacy named nav exports (kept for backward compat) ─────────────────────

export const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', path: '/super-admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Schools', path: '/super-admin/schools', icon: 'School' },
  { label: 'Subscriptions', path: '/super-admin/subscriptions', icon: 'CreditCard' },
  { label: 'Plans', path: '/super-admin/plans', icon: 'Package' },
  { label: 'Bulk Messaging', path: '/super-admin/bulk-messaging', icon: 'MessageSquare' },
  { label: 'Support Tickets', path: '/super-admin/support', icon: 'LifeBuoy' },
  { label: 'Users', path: '/super-admin/users', icon: 'Users' },
  { label: 'Training Centre', path: '/super-admin/training', icon: 'BookOpen' },
  { label: 'Reports', path: '/super-admin/reports', icon: 'BarChart3' },
  { label: 'Settings', path: '/super-admin/settings', icon: 'Settings' },
]

export const SCHOOL_ADMIN_NAV = [
  { label: 'Dashboard', path: '/school-admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Students', path: '/school-admin/students', icon: 'GraduationCap' },
  { label: 'Drivers', path: '/school-admin/drivers', icon: 'UserCheck' },
  { label: 'Buses', path: '/school-admin/buses', icon: 'Bus' },
  { label: 'Routes', path: '/school-admin/routes', icon: 'Route' },
  { label: 'Live Map', path: '/school-admin/live-map', icon: 'Map' },
  { label: 'Attendance', path: '/school-admin/attendance', icon: 'CalendarCheck' },
  { label: 'Leave Management', path: '/school-admin/leave', icon: 'CalendarOff' },
  { label: 'Notifications', path: '/school-admin/notifications', icon: 'Bell' },
  { label: 'Lost & Found', path: '/school-admin/lost-found', icon: 'Package' },
  { label: 'Bus Transfer', path: '/school-admin/bus-transfer', icon: 'ArrowLeftRight' },
  { label: 'Guest Drivers', path: '/school-admin/guest-drivers', icon: 'UserPlus' },
  { label: 'Support', path: '/school-admin/support', icon: 'LifeBuoy' },
  { label: 'Reports', path: '/school-admin/reports', icon: 'BarChart3' },
  { label: 'Settings', path: '/school-admin/settings', icon: 'Settings' },
]

export const PUBLIC_NAV = [
  { label: 'Home', path: '/' },
  { label: 'Features', path: '/#features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Get In Touch', path: '/contact' },
]

export const PLAN_FEATURES = {
  basic: [
    'Up to 200 students',
    'Up to 5 buses',
    'Up to 10 drivers',
    'Real-time GPS tracking',
    'QR attendance',
    'Push notifications',
    'Basic reports',
    'Email support',
  ],
  standard: [
    'Up to 500 students',
    'Up to 15 buses',
    'Up to 25 drivers',
    'Real-time GPS tracking',
    'QR attendance',
    'Push notifications',
    'WhatsApp notifications',
    'Leave management',
    'Lost & found',
    'Bus transfer module',
    'Advanced reports',
    'Priority email support',
    'Training centre access',
  ],
  premium: [
    'Unlimited students',
    'Unlimited buses',
    'Unlimited drivers',
    'Real-time GPS tracking',
    'QR attendance',
    'Push notifications',
    'WhatsApp + SMS notifications',
    'Leave management',
    'Lost & found',
    'Bus transfer module',
    'Guest driver support',
    'Full analytics & reports',
    'Audit logs',
    'API access',
    'Dedicated support',
    'Custom onboarding',
    'Training centre access',
  ],
}

export const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Information' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'leave', label: 'Leave' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'message', label: 'Message' },
  { value: 'system', label: 'System' },
]

export const EMERGENCY_ALERT_TYPES = [
  { value: 'breakdown', label: 'Bus Breakdown' },
  { value: 'road_closure', label: 'Road Closure' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'other', label: 'Other' },
]

export const LEAVE_REASONS = [
  'Sick leave',
  'Family event',
  'Public holiday',
  'School function',
  'Personal reasons',
  'Travel',
  'Other',
]

export const SUPPORT_CATEGORIES = [
  'Technical Issue',
  'Billing Query',
  'Feature Request',
  'Driver Issue',
  'Student Issue',
  'Route Issue',
  'App Issue',
  'Other',
]

export const SUPPORT_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
]

export const CLASSES = ['KG 1', 'KG 2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
export const DIVISIONS = ['A', 'B', 'C', 'D', 'E']
export const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandmother', 'Grandfather', 'Uncle', 'Aunt', 'Sibling']
export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Online', 'Cheque', 'Card']
export const BILLING_CYCLES = ['monthly', 'annual']
