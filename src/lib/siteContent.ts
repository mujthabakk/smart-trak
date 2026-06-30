import {
  MapPin, QrCode, Bell, Route, ArrowLeftRight, UserPlus, Package, CalendarOff,
  Map, BarChart3, BookOpen, ShieldCheck, Bus, Users, GraduationCap, UserCheck,
  Shield, School, MessagesSquare, Smartphone,
  LayoutDashboard, Wallet, Navigation, Clock, Volume2, ShieldAlert, MessageSquare,
  RefreshCw, LayoutGrid, Repeat, Headphones, Award, RadioTower, ThumbsUp, Send,
  Download, Database, GraduationCap as GradCap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* Real product data extracted from SmartTrack PRD v1.1 (AKIRA PLC, June 2026) */

export const SITE_STATS = [
  { value: '99+', label: 'Schools onboarded' },
  { value: '24,580', label: 'Students tracked daily' },
  { value: '420', label: 'Buses on the road' },
  { value: '99.9%', label: 'Platform uptime' },
]

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export const FEATURES: Feature[] = [
  { icon: MapPin, title: 'Real-time GPS Tracking', description: 'Live bus location streamed over WebSockets, updating every 5 seconds with ETA to each stop.' },
  { icon: QrCode, title: 'QR Attendance System', description: 'Safety QR per bus, Route QR per route, and a unique Student QR — secure, HMAC-signed scans gate every trip.' },
  { icon: Route, title: 'Smart Route Management', description: 'Auto-build pickup & drop routes from student locations, with a Kanban board to drag students between routes.' },
  { icon: Bell, title: 'Instant Notifications', description: 'FCM push, WhatsApp and email — pickup, drop, proximity, leave and emergency alerts reach parents in real time.' },
  { icon: ArrowLeftRight, title: 'Bus Transfer Module', description: 'Handle breakdowns mid-trip: reassign a replacement bus and auto-transfer all student attendance data.' },
  { icon: UserPlus, title: 'Guest Driver Management', description: 'Temporary drivers scan Student QRs and start trips only after one-tap School Admin approval.' },
  { icon: Map, title: 'Live Fleet Map', description: 'See every active bus on one map — driver, current stop, speed and status — filter by pickup or drop.' },
  { icon: CalendarOff, title: 'Leave Management', description: 'Parents apply for leave in-app; approved students drop off the driver’s attendance list automatically.' },
  { icon: Package, title: 'Lost & Found', description: 'Drivers report found items with photos; parents browse and submit claims from their app.' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Daily/weekly/monthly attendance, route on-time %, driver activity and bus utilisation — export to Excel.' },
  { icon: BookOpen, title: 'Training Centre', description: 'Role-targeted video modules for admins, drivers and parents with per-user view tracking.' },
  { icon: ShieldCheck, title: 'Subscription Onboarding', description: 'Self-serve plan selection with auto-provisioned consoles and credentials delivered by email + WhatsApp.' },
]

export interface QRType {
  icon: LucideIcon
  title: string
  description: string
}

export const QR_TYPES: QRType[] = [
  { icon: Bus, title: 'Safety QR', description: 'One per bus, placed inside the vehicle. Scanned to start and end every trip — a physical gate against unauthorised operation.' },
  { icon: Route, title: 'Route QR', description: 'One per route (pickup & drop). Scanning loads the correct student attendance list and starts GPS tracking.' },
  { icon: QrCode, title: 'Student QR', description: 'Unique, HMAC-signed code per student. Used by guest drivers to identify students; downloadable from the parent app.' },
]

export interface RoleItem {
  icon: LucideIcon
  title: string
  platform: string
  description: string
}

export const USER_ROLES: RoleItem[] = [
  { icon: Shield, title: 'Super Admin', platform: 'Web', description: 'Manages all schools, subscriptions, billing, onboarding and training content across the platform.' },
  { icon: School, title: 'School Admin', platform: 'Web + Mobile', description: 'Runs a school’s students, drivers, buses, routes, attendance and bus transfers.' },
  { icon: UserCheck, title: 'Driver', platform: 'Mobile App', description: 'Conducts pickup/drop trips, scans QR codes and marks attendance stop by stop.' },
  { icon: UserPlus, title: 'Guest Driver', platform: 'Mobile App', description: 'Temporary driver who scans student QRs and starts trips after admin approval.' },
  { icon: GraduationCap, title: 'Parent / Student', platform: 'Mobile App', description: 'Tracks the bus live, views attendance, applies for leave and claims lost items.' },
  { icon: MessagesSquare, title: 'Everyone', platform: 'All roles', description: 'Real-time notifications, in-app messaging, profile management and secure JWT sessions.' },
]

export interface Step {
  title: string
  description: string
}

export const ONBOARD_STEPS: Step[] = [
  { title: 'Choose your plan', description: 'Compare Basic, Standard and Premium and pick the tier that fits your fleet.' },
  { title: 'Submit school details', description: 'A short form captures your school, contact and estimated student & bus counts.' },
  { title: 'Get approved & provisioned', description: 'We create your console and send login credentials by email and WhatsApp.' },
  { title: 'Go live', description: 'Add students, drivers and routes — print QR codes and start tracking the same day.' },
]

export interface FaqItem {
  q: string
  a: string
}

export interface FaqGroup {
  category: string
  items: FaqItem[]
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    category: 'Features',
    items: [
      { q: 'How does live bus tracking work?', a: 'Each trip streams the bus’s GPS location over WebSockets, updating roughly every 5 seconds. Parents see the live position and an estimated arrival time at their child’s stop — but only while a trip is active.' },
      { q: 'What are the three QR code types?', a: 'A Safety QR is fixed inside each bus and gates trip start/end. A Route QR (one for pickup, one for drop) loads the correct attendance list. A Student QR uniquely identifies each child and is used by guest drivers and downloadable from the parent app.' },
      { q: 'How are attendance and notifications handled?', a: 'Drivers mark each student present/absent at every stop. Parents instantly receive push (FCM), and credential/critical events also go out over WhatsApp and email. Proximity alerts notify parents 1–3 stops before arrival.' },
      { q: 'What happens if a bus breaks down mid-trip?', a: 'The driver raises a breakdown alert; the School Admin assigns a replacement bus from the Bus Transfer module. Attendance data transfers automatically to the new trip and all affected parents are notified.' },
    ],
  },
  {
    category: 'Setup & Onboarding',
    items: [
      { q: 'How do schools get started?', a: 'Pick a plan on the pricing page and complete the onboarding form. We create a pending school record; once approved, a School Admin console and temporary credentials are auto-generated and delivered by email and WhatsApp.' },
      { q: 'Can we import existing students and schools in bulk?', a: 'Yes. School Admins import students from Excel/CSV, and Super Admins can bulk-onboard multiple schools from a spreadsheet. The system maps columns, validates the data and sends credentials in batch.' },
      { q: 'Do drivers and parents need separate apps?', a: 'Drivers (including guest drivers) use the Flutter driver app; parents and students share a single Flutter app. Super Admins and School Admins use this web console — School Admins also have a companion mobile app.' },
    ],
  },
  {
    category: 'Data & Privacy',
    items: [
      { q: 'How is our data secured?', a: 'Authentication uses JWT with refresh tokens and FCM device tokens are cleared on logout. QR codes are HMAC-signed and invalidated when a bus, route or student is deactivated. Data is stored in PostgreSQL with files on secure cloud storage.' },
      { q: 'Who can see a student’s location and attendance?', a: 'Only that student’s parents, the operating driver and the School Admin. Live tracking is available solely during an active trip, and guest-driver sessions are time-limited and expire after the trip or 12 hours.' },
      { q: 'Is the platform available in other languages?', a: 'Strings are internationalised and the layout supports RTL. Multi-language support (Arabic, Malayalam, Tamil, Urdu) is on the roadmap.' },
    ],
  },
]

export interface Plan {
  id: string
  name: string
  tagline: string
  monthly: number
  pricePerStudent: number
  maxStudents: number
  popular?: boolean
  limits: { students: string; buses: string; drivers: string }
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For small schools getting started with tracking.',
    monthly: 49,
    pricePerStudent: 0.50,
    maxStudents: 200,
    limits: { students: '200', buses: '5', drivers: '10' },
    features: [
      'Real-time GPS tracking',
      'QR attendance (Safety + Route + Student)',
      'Push notifications',
      'Live fleet map',
      'Basic attendance reports',
      'Email support',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'For growing fleets that need automation.',
    monthly: 99,
    pricePerStudent: 0.80,
    maxStudents: 500,
    popular: true,
    limits: { students: '500', buses: '15', drivers: '25' },
    features: [
      'Everything in Basic',
      'WhatsApp notifications',
      'Leave management',
      'Lost & found',
      'Bus transfer module',
      'Advanced reports & analytics',
      'Training centre access',
      'Priority email support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'For large districts that need it all.',
    monthly: 199,
    pricePerStudent: 1.20,
    maxStudents: 999999,
    limits: { students: 'Unlimited', buses: 'Unlimited', drivers: 'Unlimited' },
    features: [
      'Everything in Standard',
      'WhatsApp + SMS notifications',
      'Guest driver management',
      'Full analytics & audit logs',
      'Bulk school & student import',
      'API access',
      'Dedicated support & onboarding',
    ],
  },
]

export const CONTACT_INFO = {
  email: 'sales@akiraplc.com',
  website: 'www.smarttrack.live',
  phone: '+971 54 250 4233',
  company: 'Akira Software Solutions',
  address: 'MBZ 9, Mohammed Bin Zayed City, Abu Dhabi, UAE',
  hours: 'Sunday – Thursday, 9:00 AM – 6:00 PM GST',
}

export interface Office {
  flag: string
  country: string
  entity: string
  lines: string[]
  phone: string
}

export const OFFICES: Office[] = [
  { flag: '🇦🇪', country: 'UAE', entity: 'Akira Software Solutions LLC', lines: ['MBZ 9, Mohammed Bin Zayed City', 'Abu Dhabi'], phone: '+971 54 250 4233' },
  { flag: '🇮🇳', country: 'India', entity: 'Akira Software Solutions Pvt. Ltd.', lines: ['4th Floor, Nila Building', 'Technopark Campus, Kerala'], phone: '+91 9846 504 233' },
  { flag: '🇨🇦', country: 'Canada', entity: 'Akira Software Solutions INC.', lines: ['1 Concord Gate, Suite #702', 'North York, ON M3C 3N6'], phone: '+1 (416) 571-1270' },
]

export interface AppScreen {
  src: string
  title: string
  caption: string
}

// Real SmartTrack mobile app screens (from the official brochure)
export const APP_SCREENS: AppScreen[] = [
  { src: '/app/login.png', title: 'Secure Sign In', caption: 'School code, username & password — one login for parents, drivers and guests.' },
  { src: '/app/attendance.png', title: 'Live Attendance', caption: 'Track pickup and drop status for each child, day by day.' },
  { src: '/app/alerts.png', title: 'Real-time Alerts', caption: '“Boarded”, “Reached School” and trip updates the moment they happen.' },
  { src: '/app/location.png', title: 'Pickup & Drop Points', caption: 'Pin pickup and drop locations on the map for every student.' },
  { src: '/app/message.png', title: 'Compose Message', caption: 'Message drivers or admins with quick templates.' },
  { src: '/app/fees.png', title: 'Fee Details', caption: 'View due and paid transport payments at a glance.' },
]

export const SUPPORT_TOPICS = [
  'General enquiry',
  'Request a demo',
  'Pricing & plans',
  'Technical support',
  'Partnership',
]

/* ───── smarttrack.live marketing content ───── */

export const HERO = {
  title: 'Real-Time School Bus Tracking System',
  subtitle: 'Ensure your child’s safety and on-time arrival with SmartTrack — a reliable, award-winning school bus tracking solution.',
  demoNote: 'Get a free demo and simplify school transport with SmartTrack.',
  primaryCta: 'Subscribe Now',
  secondaryCta: 'Try For Free',
}

export const SMART_PRO = {
  heading: 'Smart Track Pro',
  body:
    'SmartTrack is an award-winning School Bus Tracking System that combines real-time GPS tracking, RFID integration and instant alert notifications — giving schools, parents and drivers total visibility over every journey.',
}

export const SMART_FEATURES: Feature[] = [
  { icon: LayoutDashboard, title: 'Smart Dashboard', description: 'A single screen to monitor every bus, route and student in real time.' },
  { icon: Bell, title: 'Smart Alert', description: 'Instant push alerts for boarding, drop-off, delays and emergencies.' },
  { icon: MapPin, title: 'Live Tracking', description: 'Follow the bus live on the map with an accurate ETA to each stop.' },
  { icon: QrCode, title: 'Attendance', description: 'Automated pickup & drop attendance for every student, every trip.' },
  { icon: CalendarOff, title: 'Mark Absent', description: 'Parents mark a child absent in a tap, so no time is wasted waiting.' },
  { icon: Wallet, title: 'Fee Details', description: 'View due and paid transport fees right inside the app.' },
]

export interface FunctionalityTab {
  key: string
  label: string
  screen: string
  points: { title: string; desc: string }[]
}

export const FUNCTIONALITIES: FunctionalityTab[] = [
  {
    key: 'basic', label: 'Basic', screen: '/app/login.png',
    points: [
      { title: 'Real-Time Tracking', desc: 'Monitor the exact location of school buses in real-time.' },
      { title: 'Safety Alerts', desc: 'Instant notifications for route deviations, delays and arrivals.' },
      { title: 'RFID Integration', desc: 'Track individual students with RFID & QR identification.' },
      { title: 'Award-Winning Technology', desc: 'A proven, recognised platform trusted by schools.' },
    ],
  },
  {
    key: 'parent', label: 'Parent', screen: '/app/alerts.png',
    points: [
      { title: 'Parent App', desc: 'A friendly interface to track your child’s bus live.' },
      { title: 'Absence Alerts', desc: 'Mark your child absent in one tap from the app.' },
      { title: 'Proximity Auto-Ringer', desc: 'Get alerted as the bus nears your stop.' },
      { title: 'Emergency Alerts', desc: 'High-priority notifications for any on-route emergency.' },
    ],
  },
  {
    key: 'admin', label: 'Admin', screen: '/app/location.png',
    points: [
      { title: 'School Dashboard', desc: 'Comprehensive tools to manage fleets, routes and students.' },
      { title: 'All Vehicles in One Screen', desc: 'Your entire fleet live on a single dashboard.' },
      { title: 'Easy Bus Swapping', desc: 'Reassign a replacement bus in seconds during a breakdown.' },
      { title: 'Quick Communication', desc: 'Broadcast to all parents or message a single driver.' },
    ],
  },
  {
    key: 'assistant', label: 'Assistant', screen: '/app/attendance.png',
    points: [
      { title: 'Automated Attendance', desc: 'Scan and mark students automatically at each stop.' },
      { title: 'Risk-Free Journeys', desc: 'Safety-QR gated trips prevent unauthorised driving.' },
      { title: 'Emergency Support', desc: 'One-tap breakdown and emergency alerts.' },
      { title: 'Job Efficiency', desc: 'Everything the assistant needs in one simple app.' },
    ],
  },
]

export interface Benefit { icon: LucideIcon; title: string; desc: string }

export const PARENT_BENEFITS: Benefit[] = [
  { icon: RefreshCw, title: 'Real-Time Updates', desc: 'Know exactly where the bus is and when it will arrive.' },
  { icon: CalendarOff, title: 'Absence Alerts', desc: 'Tell the supervisor in one tap when your child won’t travel.' },
  { icon: Clock, title: 'No More Waiting Time', desc: 'Proximity alerts mean you reach the stop right on time.' },
  { icon: Volume2, title: 'Auto Ringer', desc: 'Your phone rings automatically as the bus approaches.' },
  { icon: ShieldAlert, title: 'Emergency Alerts', desc: 'Instant high-priority alerts for any on-route emergency.' },
  { icon: MessageSquare, title: 'Feedback & Ticketing', desc: 'Raise issues and track resolutions from the app.' },
]

export const ADMIN_BENEFITS: Benefit[] = [
  { icon: LayoutGrid, title: 'All Vehicles in One Screen', desc: 'See your entire fleet live on a single dashboard.' },
  { icon: BarChart3, title: 'Simplified Task Management', desc: 'Manage students, routes and drivers with ease.' },
  { icon: RefreshCw, title: 'Real-Time Updates', desc: 'Live status of every trip as it happens.' },
  { icon: Repeat, title: 'Easy Bus Swapping', desc: 'Reassign a replacement bus in seconds during a breakdown.' },
  { icon: MessageSquare, title: 'Quick Communication', desc: 'Broadcast to all parents or message a single driver.' },
  { icon: Headphones, title: 'Emergency Support', desc: 'Dedicated support whenever you need it.' },
]

export const ASSISTANT_BENEFITS: Benefit[] = [
  { icon: QrCode, title: 'Automated Attendance', desc: 'Scan and mark students automatically at each stop.' },
  { icon: ShieldAlert, title: 'Emergency Support', desc: 'One-tap breakdown and emergency alerts.' },
  { icon: Clock, title: 'No Waiting Time', desc: 'Optimised stop order keeps every trip on schedule.' },
  { icon: Shield, title: 'Child’s Safety', desc: 'Verified boarding and drop-off for every student.' },
  { icon: ShieldCheck, title: 'Risk-Free Journeys', desc: 'Safety-QR gated trips prevent unauthorised driving.' },
  { icon: ThumbsUp, title: 'Job Efficiency', desc: 'Everything the driver needs in one simple app.' },
]

export interface HowStep { icon: LucideIcon; title: string; desc: string }

export const HOW_STEPS: HowStep[] = [
  { icon: Download, title: 'App Installation', desc: 'Install the SmartTrack Pro app and complete the configuration process.' },
  { icon: Database, title: 'Data Integration', desc: 'Import student data and assign students to their respective routes.' },
  { icon: GradCap, title: 'Training', desc: 'Provide comprehensive training to school transportation stakeholders.' },
]

export { Smartphone, Users, Navigation, RadioTower, Award, Send }
