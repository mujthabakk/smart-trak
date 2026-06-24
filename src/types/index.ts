export type Theme = 'electric' | 'royal' | 'forest' | 'crimson' | 'midnight' | 'ocean'
export type ColorMode = 'light' | 'dark'
export type UserRole = 'super_admin' | 'school_admin' | 'driver' | 'guest_driver' | 'parent'
export type PlanTier = 'basic' | 'standard' | 'premium'
export type SchoolStatus = 'active' | 'suspended' | 'pending'
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'trial'
export type TripType = 'pickup' | 'drop'
export type TripStatus = 'not_started' | 'in_progress' | 'completed'
export type AttendanceStatus = 'present' | 'absent' | 'leave'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type LostFoundStatus = 'reported' | 'claimed' | 'resolved'
export type TransferStatus = 'initiated' | 'in_progress' | 'completed'
export type GuestTripStatus = 'pending_approval' | 'approved' | 'rejected' | 'completed'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  school_id?: string
  school_name?: string
  avatar?: string
  fcm_token?: string
  created_at: string
  last_login?: string
}

export interface Plan {
  id: string
  name: string
  label: string
  price_monthly: number
  price_annual: number
  billing_cycle: 'monthly' | 'annual'
  max_students: number
  max_buses: number
  max_drivers: number
  features: string[]
  is_popular?: boolean
}

export interface School {
  id: string
  name: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  plan_id: string
  plan_name: string
  status: SchoolStatus
  subdomain: string
  student_count: number
  driver_count: number
  bus_count: number
  route_count: number
  admin_name?: string
  admin_email?: string
  created_at: string
  logo_url?: string
}

export interface Subscription {
  id: string
  school_id: string
  school_name: string
  plan_id: string
  plan_name: string
  start_date: string
  end_date: string
  amount_paid: number
  payment_method: string
  status: SubscriptionStatus
}

export interface ParentDetail {
  id: string
  student_id: string
  parent_name: string
  relationship: string
  email: string
  phone: string
  whatsapp: string
}

export interface Student {
  id: string
  school_id: string
  name: string
  class: string
  division: string
  roll_number: string
  dob: string
  photo_url?: string
  student_qr_code?: string
  is_active: boolean
  pickup_stop_id?: string
  drop_stop_id?: string
  route_name?: string
  parents: ParentDetail[]
  created_at: string
}

export interface Driver {
  id: string
  school_id: string
  user_id?: string
  name: string
  employee_id: string
  email: string
  phone: string
  whatsapp: string
  license_number: string
  license_expiry: string
  photo_url?: string
  address?: string
  assigned_bus_id?: string
  assigned_bus_number?: string
  is_active: boolean
  created_at: string
}

export interface Bus {
  id: string
  school_id: string
  bus_number: string
  seat_capacity: number
  make_model?: string
  year?: number
  insurance_expiry?: string
  fitness_cert_expiry?: string
  safety_qr_code?: string
  is_active: boolean
  current_trip_id?: string
  driver_id?: string
  driver_name?: string
  status?: 'running' | 'idle' | 'offline'
  current_stop?: string
  created_at: string
}

export interface Stop {
  id: string
  route_id: string
  name: string
  latitude: number
  longitude: number
  order_index: number
  estimated_time?: string
  student_count?: number
}

export interface Route {
  id: string
  school_id: string
  bus_id?: string
  bus_number?: string
  name: string
  type: TripType
  start_point: string
  end_point: string
  route_qr_code?: string
  stops: Stop[]
  is_active: boolean
  student_count?: number
  driver_id?: string
  driver_name?: string
  created_at: string
}

export interface Trip {
  id: string
  route_id: string
  route_name: string
  driver_id: string
  driver_name: string
  bus_id: string
  bus_number: string
  trip_type: TripType
  status: TripStatus
  started_at?: string
  ended_at?: string
  student_count: number
}

export interface AttendanceRecord {
  id: string
  trip_id: string
  student_id: string
  student_name: string
  student_class: string
  stop_id?: string
  stop_name?: string
  status: AttendanceStatus
  pickup_time?: string
  drop_time?: string
  route_name?: string
  date: string
}

export interface Leave {
  id: string
  student_id: string
  student_name: string
  student_class?: string
  school_id: string
  from_date: string
  to_date: string
  reason?: string
  status: LeaveStatus
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface LFClaim {
  id: string
  lost_found_id: string
  student_id: string
  student_name: string
  claim_note?: string
  status: 'pending' | 'resolved'
  claimed_at?: string
}

export interface LostFoundItem {
  id: string
  school_id: string
  bus_id: string
  bus_number: string
  driver_id: string
  driver_name: string
  description: string
  photo_url?: string
  image_url?: string
  reported_at: string
  status: LostFoundStatus
  claims: LFClaim[]
}

export interface Message {
  id: string
  school_id: string
  sender_id: string
  sender_name: string
  sender_role: UserRole
  recipient_type: 'all_parents' | 'route_parents' | 'individual' | 'all_drivers' | 'driver' | 'admin'
  recipient_id?: string
  recipient_name?: string
  content: string
  sent_at: string
  read_at?: string
  is_scheduled?: boolean
  scheduled_at?: string
}

export interface AppNotification {
  id: string
  school_id?: string
  user_id?: string
  title: string
  body: string
  type: 'info' | 'warning' | 'success' | 'error' | 'emergency' | 'leave' | 'attendance' | 'message' | 'system'
  is_read: boolean
  created_at: string
  action_url?: string
}

export interface TicketReply {
  id: string
  ticket_id: string
  user_id: string
  user_name: string
  user_role: UserRole
  content: string
  created_at: string
}

export interface SupportTicket {
  id: string
  school_id?: string
  school_name?: string
  reporter_id: string
  reporter_name: string
  reporter_role: UserRole
  type: string
  priority: TicketPriority
  status: TicketStatus
  description: string
  assigned_to?: string
  created_at: string
  replies: TicketReply[]
}

export interface TrainingModule {
  id: string
  title: string
  description: string
  video_url: string
  thumbnail_url?: string
  target_role: UserRole
  is_published: boolean
  created_at: string
  view_count: number
  duration_mins?: number
}

export interface BusTransfer {
  id: string
  school_id: string
  original_trip_id: string
  original_bus_id: string
  original_bus_number: string
  new_bus_id: string
  new_bus_number: string
  new_driver_id?: string
  new_driver_name?: string
  authorised_by: string
  transfer_at: string
  status: TransferStatus
  reason: string
  affected_students: number
}

export interface GuestTrip {
  id: string
  school_id: string
  guest_driver_name: string
  guest_driver_phone: string
  bus_registration: string
  status: GuestTripStatus
  approved_by?: string
  started_at?: string
  ended_at?: string
  students: Array<{ id: string; name: string; class: string; division: string }>
  created_at: string
}

export interface StatsCard {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: string
  color: string
  subtitle?: string
}

export interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  width?: string
  className?: string
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface FilterState {
  search: string
  [key: string]: string | number | boolean | undefined
}

export interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
  children?: NavItem[]
}

export interface RevenueData {
  month: string
  revenue: number
  schools: number
}

export interface BusLocation {
  trip_id: string
  bus_id: string
  bus_number: string
  driver_name: string
  latitude: number
  longitude: number
  speed: number
  current_stop?: string
  status: TripStatus
  recorded_at: string
}
