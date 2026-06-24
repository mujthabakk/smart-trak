import type { UserRole } from '@/store/authStore'

export interface DemoAccount {
  role: UserRole
  email: string
  password: string
  name: string
  school_id?: string
  school_name?: string
  phone?: string
  /** Which app surface this role uses. The web console serves super_admin + school_admin. */
  panel: 'web' | 'mobile'
  description: string
}

/**
 * Demo credentials for every SmartTrack user role.
 * Web panels: Super Admin + School Admin.
 * Mobile app roles: Driver, Guest Driver, Parent (listed for completeness).
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'super_admin',
    email: 'superadmin@smarttrack.ae',
    password: 'Super@123',
    name: 'Khalid Al Maktoum',
    phone: '+971 50 100 1000',
    panel: 'web',
    description: 'Full platform control — schools, billing, plans',
  },
  {
    role: 'school_admin',
    email: 'admin@greenfield.ae',
    password: 'School@123',
    name: 'Hassan Ahmed',
    school_id: 'SCH-001',
    school_name: 'Greenfield Academy',
    phone: '+971 50 200 2000',
    panel: 'web',
    description: 'Manages Greenfield Academy fleet & students',
  },
  {
    role: 'school_admin',
    email: 'admin@alnoor.ae',
    password: 'School@123',
    name: 'Fatima Al Ali',
    school_id: 'SCH-002',
    school_name: 'Al-Noor International School',
    phone: '+971 50 300 3000',
    panel: 'web',
    description: 'Manages Al-Noor International School',
  },
  {
    role: 'driver',
    email: 'driver@smarttrack.ae',
    password: 'Driver@123',
    name: 'Salim Ahmed Rashid',
    school_id: 'SCH-001',
    school_name: 'Greenfield Academy',
    phone: '+971 50 400 4000',
    panel: 'mobile',
    description: 'Bus B-002 driver — uses the mobile app',
  },
  {
    role: 'guest_driver',
    email: 'guest@smarttrack.ae',
    password: 'Guest@123',
    name: 'Omar Yusuf',
    school_id: 'SCH-001',
    school_name: 'Greenfield Academy',
    phone: '+971 50 500 5000',
    panel: 'mobile',
    description: 'Temporary relief driver — uses the mobile app',
  },
  {
    role: 'parent',
    email: 'parent@smarttrack.ae',
    password: 'Parent@123',
    name: 'Aisha Mohammed',
    school_id: 'SCH-001',
    school_name: 'Greenfield Academy',
    phone: '+971 50 600 6000',
    panel: 'mobile',
    description: 'Parent of 2 students — uses the mobile app',
  },
]

export function findDemoAccount(email: string, password: string): DemoAccount | undefined {
  const e = email.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e && a.password === password)
}

export const WEB_ACCOUNTS = DEMO_ACCOUNTS.filter((a) => a.panel === 'web')
export const MOBILE_ACCOUNTS = DEMO_ACCOUNTS.filter((a) => a.panel === 'mobile')
