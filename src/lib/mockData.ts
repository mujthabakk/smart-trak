import type {
  School, Plan, Student, Driver, Bus, Route, Stop, Trip,
  AttendanceRecord, Leave, LostFoundItem, AppNotification,
  SupportTicket, TrainingModule, Subscription, BusTransfer,
  GuestTrip, Message, ParentDetail
} from '@/types'

// ─── Plans ─────────────────────────────────────────────────────────────────────
export const mockPlans: Plan[] = [
  { id: 'plan_basic', name: 'basic', label: 'Basic', price_monthly: 49, price_annual: 470, price_per_student: 0.50, billing_cycle: 'monthly', max_students: 200, max_buses: 5, max_drivers: 10, features: ['GPS Tracking', 'QR Attendance', 'Push Notifications', 'Basic Reports', 'Email Support'] },
  { id: 'plan_standard', name: 'standard', label: 'Standard', price_monthly: 99, price_annual: 950, price_per_student: 0.80, billing_cycle: 'monthly', max_students: 500, max_buses: 15, max_drivers: 25, is_popular: true, features: ['Everything in Basic', 'WhatsApp Alerts', 'Leave Management', 'Lost & Found', 'Bus Transfer', 'Training Centre', 'Priority Support'] },
  { id: 'plan_premium', name: 'premium', label: 'Premium', price_monthly: 199, price_annual: 1910, price_per_student: 1.20, billing_cycle: 'monthly', max_students: 99999, max_buses: 99999, max_drivers: 99999, features: ['Everything in Standard', 'Unlimited All', 'Guest Driver Module', 'SMS Notifications', 'Full Analytics', 'Audit Logs', 'API Access', 'Dedicated Support'] },
]

// ─── Schools ──────────────────────────────────────────────────────────────────
export const mockSchools: School[] = [
  { id: 'sch_001', name: 'Al-Noor International School', address: '45 Sheikh Zayed Road', city: 'Dubai', state: 'Dubai', post_code: '00000', country: 'UAE', phone: '+971-4-555-0100', email: 'admin@alnoor.ae', website: 'www.alnoor.ae', plan_id: 'plan_premium', plan_name: 'Premium', status: 'active', subdomain: 'alnoor', student_count: 1240, driver_count: 18, bus_count: 20, route_count: 12, admin_name: 'Hassan Al-Rashid', admin_email: 'hassan@alnoor.ae', created_at: '2024-09-01T08:00:00Z' },
  { id: 'sch_002', name: 'Sunrise Academy', address: '12 Knowledge Village', city: 'Abu Dhabi', state: 'Abu Dhabi', post_code: '00000', country: 'UAE', phone: '+971-2-555-0200', email: 'admin@sunrise.ae', website: 'www.sunrise.ae', plan_id: 'plan_standard', plan_name: 'Standard', status: 'active', subdomain: 'sunrise', student_count: 480, driver_count: 8, bus_count: 10, route_count: 6, admin_name: 'Fatima Al-Zahra', admin_email: 'fatima@sunrise.ae', created_at: '2024-10-15T08:00:00Z' },
  { id: 'sch_003', name: 'Green Valley School', address: '78 Education City', city: 'Sharjah', state: 'Sharjah', post_code: '00000', country: 'UAE', phone: '+971-6-555-0300', email: 'admin@greenvalley.ae', website: 'www.greenvalley.ae', plan_id: 'plan_standard', plan_name: 'Standard', status: 'active', subdomain: 'greenvalley', student_count: 320, driver_count: 6, bus_count: 7, route_count: 4, admin_name: 'Mohammed Khalid', admin_email: 'mohammed@greenvalley.ae', created_at: '2025-01-10T08:00:00Z' },
  { id: 'sch_004', name: 'Bright Minds Institute', address: '33 Academic Boulevard', city: 'Ajman', state: 'Ajman', post_code: '00000', country: 'UAE', phone: '+971-6-555-0400', email: 'admin@brightminds.ae', plan_id: 'plan_basic', plan_name: 'Basic', status: 'active', subdomain: 'brightminds', student_count: 175, driver_count: 4, bus_count: 4, route_count: 3, admin_name: 'Aisha Rahman', admin_email: 'aisha@brightminds.ae', created_at: '2025-02-20T08:00:00Z' },
  { id: 'sch_005', name: 'Future Leaders School', address: '90 Industrial Area', city: 'Fujairah', state: 'Fujairah', post_code: '00000', country: 'UAE', phone: '+971-9-555-0500', email: 'admin@futureleaders.ae', plan_id: 'plan_basic', plan_name: 'Basic', status: 'suspended', subdomain: 'futureleaders', student_count: 140, driver_count: 3, bus_count: 3, route_count: 2, admin_name: 'Omar Abdullah', admin_email: 'omar@futureleaders.ae', created_at: '2025-03-05T08:00:00Z' },
  { id: 'sch_006', name: 'Star International Academy', address: '22 Academic Zone', city: 'Ras Al Khaimah', state: 'RAK', post_code: '00000', country: 'UAE', phone: '+971-7-555-0600', email: 'admin@starint.ae', website: 'www.starint.ae', plan_id: 'plan_premium', plan_name: 'Premium', status: 'active', subdomain: 'starint', student_count: 890, driver_count: 14, bus_count: 16, route_count: 9, admin_name: 'Noor Hussain', admin_email: 'noor@starint.ae', created_at: '2024-08-12T08:00:00Z' },
  { id: 'sch_007', name: 'Excellence School', address: '5 Knowledge Park', city: 'Dubai', state: 'Dubai', post_code: '00000', country: 'UAE', phone: '+971-4-555-0700', email: 'admin@excellence.ae', plan_id: 'plan_standard', plan_name: 'Standard', status: 'pending', subdomain: 'excellence', student_count: 0, driver_count: 0, bus_count: 0, route_count: 0, admin_name: 'Khalil Ahmad', admin_email: 'khalil@excellence.ae', created_at: '2026-06-20T08:00:00Z' },
  { id: 'sch_008', name: 'Pioneer Institute', address: '67 University Road', city: 'Abu Dhabi', state: 'Abu Dhabi', post_code: '00000', country: 'UAE', phone: '+971-2-555-0800', email: 'admin@pioneer.ae', website: 'www.pioneer.ae', plan_id: 'plan_premium', plan_name: 'Premium', status: 'active', subdomain: 'pioneer', student_count: 1050, driver_count: 16, bus_count: 18, route_count: 11, admin_name: 'Layla Hassan', admin_email: 'layla@pioneer.ae', created_at: '2024-07-01T08:00:00Z' },
]

const makeParent = (studentId: string, name: string, rel: string, email: string, phone: string): ParentDetail => ({
  id: `par_${studentId}`, student_id: studentId, parent_name: name, relationship: rel, email, phone, whatsapp: phone,
})

// ─── Students ─────────────────────────────────────────────────────────────────
export const mockStudents: Student[] = [
  { id: 'std_001', school_id: 'sch_001', name: 'Ahmed Hassan Al-Rashid', class: '5', division: 'A', roll_number: '501', dob: '2015-03-12', is_active: true, route_name: 'Route A - Pickup', parents: [makeParent('std_001', 'Hassan Al-Rashid', 'Father', 'hassan@email.com', '+971501234567')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_002', school_id: 'sch_001', name: 'Fatima Noor Al-Zahra', class: '3', division: 'B', roll_number: '302', dob: '2017-07-22', is_active: true, route_name: 'Route B - Pickup', parents: [makeParent('std_002', 'Ali Al-Zahra', 'Father', 'ali@email.com', '+971501234568')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_003', school_id: 'sch_001', name: 'Mohammed Khalid Ibrahim', class: '7', division: 'A', roll_number: '701', dob: '2013-11-05', is_active: true, route_name: 'Route A - Pickup', parents: [makeParent('std_003', 'Khalid Ibrahim', 'Father', 'khalid@email.com', '+971501234569')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_004', school_id: 'sch_001', name: 'Aisha Rahman Siddiqui', class: '2', division: 'C', roll_number: '201', dob: '2018-04-18', is_active: true, route_name: 'Route C - Pickup', parents: [makeParent('std_004', 'Rahman Siddiqui', 'Father', 'rahman@email.com', '+971501234570')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_005', school_id: 'sch_001', name: 'Omar Abdullah Malik', class: '9', division: 'A', roll_number: '901', dob: '2011-09-30', is_active: true, route_name: 'Route A - Pickup', parents: [makeParent('std_005', 'Abdullah Malik', 'Father', 'abdullah@email.com', '+971501234571')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_006', school_id: 'sch_001', name: 'Sara Ali Hassan', class: '6', division: 'B', roll_number: '601', dob: '2014-12-15', is_active: false, route_name: 'Route B - Pickup', parents: [makeParent('std_006', 'Ali Hassan', 'Father', 'alih@email.com', '+971501234572')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_007', school_id: 'sch_001', name: 'Yousef Mahmoud Qassim', class: '4', division: 'A', roll_number: '401', dob: '2016-06-08', is_active: true, route_name: 'Route A - Pickup', parents: [makeParent('std_007', 'Mahmoud Qassim', 'Father', 'mahmoud@email.com', '+971501234573')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_008', school_id: 'sch_001', name: 'Maryam Tariq Hussain', class: '8', division: 'B', roll_number: '801', dob: '2012-02-25', is_active: true, route_name: 'Route B - Pickup', parents: [makeParent('std_008', 'Tariq Hussain', 'Father', 'tariq@email.com', '+971501234574')], created_at: '2024-09-01T08:00:00Z' },
]

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const mockDrivers: Driver[] = [
  { id: 'drv_001', school_id: 'sch_001', name: 'Ali Mohammed Al-Faris', employee_id: 'EMP001', email: 'ali.driver@alnoor.ae', phone: '+971551234501', whatsapp: '+971551234501', license_number: 'DXB-LIC-78901', license_expiry: '2027-08-15', is_active: true, assigned_bus_id: 'bus_001', assigned_bus_number: 'B-001', created_at: '2024-09-01T08:00:00Z' },
  { id: 'drv_002', school_id: 'sch_001', name: 'Salim Ahmed Rashid', employee_id: 'EMP002', email: 'salim.driver@alnoor.ae', phone: '+971551234502', whatsapp: '+971551234502', license_number: 'DXB-LIC-78902', license_expiry: '2026-03-20', is_active: true, assigned_bus_id: 'bus_002', assigned_bus_number: 'B-002', created_at: '2024-09-01T08:00:00Z' },
  { id: 'drv_003', school_id: 'sch_001', name: 'Ibrahim Yusuf Nasser', employee_id: 'EMP003', email: 'ibrahim.driver@alnoor.ae', phone: '+971551234503', whatsapp: '+971551234503', license_number: 'DXB-LIC-78903', license_expiry: '2025-11-10', is_active: true, assigned_bus_id: 'bus_003', assigned_bus_number: 'B-003', created_at: '2024-10-01T08:00:00Z' },
  { id: 'drv_004', school_id: 'sch_001', name: 'Hassan Bilal Mohammed', employee_id: 'EMP004', email: 'hassan.driver@alnoor.ae', phone: '+971551234504', whatsapp: '+971551234504', license_number: 'DXB-LIC-78904', license_expiry: '2028-01-05', is_active: false, created_at: '2024-10-15T08:00:00Z' },
]

// ─── Buses ────────────────────────────────────────────────────────────────────
export const mockBuses: Bus[] = [
  { id: 'bus_001', school_id: 'sch_001', bus_number: 'B-001', seat_capacity: 45, make_model: 'Toyota Coaster 2022', year: 2022, insurance_expiry: '2026-12-31', fitness_cert_expiry: '2026-06-30', is_active: true, driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', status: 'running', current_stop: 'Stop 3 - Al Barsha', created_at: '2024-09-01T08:00:00Z' },
  { id: 'bus_002', school_id: 'sch_001', bus_number: 'B-002', seat_capacity: 35, make_model: 'Mitsubishi Rosa 2021', year: 2021, insurance_expiry: '2026-08-15', fitness_cert_expiry: '2026-08-15', is_active: true, driver_id: 'drv_002', driver_name: 'Salim Ahmed Rashid', status: 'running', current_stop: 'Stop 5 - JLT', created_at: '2024-09-01T08:00:00Z' },
  { id: 'bus_003', school_id: 'sch_001', bus_number: 'B-003', seat_capacity: 50, make_model: 'Toyota Coaster 2023', year: 2023, insurance_expiry: '2027-01-20', fitness_cert_expiry: '2027-01-20', is_active: true, driver_id: 'drv_003', driver_name: 'Ibrahim Yusuf Nasser', status: 'idle', created_at: '2024-10-01T08:00:00Z' },
  { id: 'bus_004', school_id: 'sch_001', bus_number: 'B-004', seat_capacity: 40, make_model: 'Hyundai County 2020', year: 2020, insurance_expiry: '2025-11-30', fitness_cert_expiry: '2025-10-15', is_active: true, status: 'offline', created_at: '2024-09-15T08:00:00Z' },
]

const makeStop = (routeId: string, name: string, lat: number, lng: number, order: number, time: string): Stop => ({
  id: `stop_${routeId}_${order}`, route_id: routeId, name, latitude: lat, longitude: lng, order_index: order, estimated_time: time, student_count: Math.floor(Math.random() * 5) + 1,
})

// ─── Routes ───────────────────────────────────────────────────────────────────
export const mockRoutes: Route[] = [
  { id: 'rte_001', school_id: 'sch_001', bus_id: 'bus_001', bus_number: 'B-001', name: 'Route A - Pickup', type: 'pickup', start_point: 'Al Barsha South', end_point: 'Al-Noor School', route_qr_code: 'QR_RTE_001', is_active: true, student_count: 28, driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', stops: [makeStop('rte_001', 'Al Barsha South 1', 25.1050, 55.1893, 1, '7:00 AM'), makeStop('rte_001', 'Al Barsha Heights', 25.1156, 55.1999, 2, '7:15 AM'), makeStop('rte_001', 'JLT Cluster T', 25.1262, 55.2105, 3, '7:30 AM')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'rte_002', school_id: 'sch_001', bus_id: 'bus_002', bus_number: 'B-002', name: 'Route B - Pickup', type: 'pickup', start_point: 'Jumeirah', end_point: 'Al-Noor School', route_qr_code: 'QR_RTE_002', is_active: true, student_count: 22, driver_id: 'drv_002', driver_name: 'Salim Ahmed Rashid', stops: [makeStop('rte_002', 'Jumeirah 1 Masjid', 25.2048, 55.2623, 1, '6:55 AM'), makeStop('rte_002', 'Safa Park Gate', 25.1874, 55.2467, 2, '7:20 AM')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'rte_003', school_id: 'sch_001', bus_id: 'bus_001', bus_number: 'B-001', name: 'Route A - Drop', type: 'drop', start_point: 'Al-Noor School', end_point: 'Al Barsha South', route_qr_code: 'QR_RTE_003', is_active: true, student_count: 28, driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', stops: [makeStop('rte_003', 'JLT Cluster T', 25.1262, 55.2105, 1, '2:30 PM'), makeStop('rte_003', 'Al Barsha Heights', 25.1156, 55.1999, 2, '2:45 PM'), makeStop('rte_003', 'Al Barsha South 1', 25.1050, 55.1893, 3, '3:00 PM')], created_at: '2024-09-01T08:00:00Z' },
]

// ─── Trips ────────────────────────────────────────────────────────────────────
export const mockTrips: Trip[] = [
  { id: 'trp_001', route_id: 'rte_001', route_name: 'Route A - Pickup', driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', bus_id: 'bus_001', bus_number: 'B-001', trip_type: 'pickup', status: 'in_progress', started_at: '2026-06-23T07:00:00Z', student_count: 28 },
  { id: 'trp_002', route_id: 'rte_002', route_name: 'Route B - Pickup', driver_id: 'drv_002', driver_name: 'Salim Ahmed Rashid', bus_id: 'bus_002', bus_number: 'B-002', trip_type: 'pickup', status: 'in_progress', started_at: '2026-06-23T06:55:00Z', student_count: 22 },
  { id: 'trp_003', route_id: 'rte_003', route_name: 'Route A - Drop', driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', bus_id: 'bus_001', bus_number: 'B-001', trip_type: 'drop', status: 'completed', started_at: '2026-06-22T14:00:00Z', ended_at: '2026-06-22T15:30:00Z', student_count: 25 },
]

// ─── Attendance ───────────────────────────────────────────────────────────────
export const mockAttendance: AttendanceRecord[] = [
  { id: 'att_001', trip_id: 'trp_001', student_id: 'std_001', student_name: 'Ahmed Hassan Al-Rashid', student_class: '5A', stop_name: 'Al Barsha Heights', status: 'present', pickup_time: '2026-06-23T07:15:00Z', route_name: 'Route A', date: '2026-06-23' },
  { id: 'att_002', trip_id: 'trp_001', student_id: 'std_003', student_name: 'Mohammed Khalid Ibrahim', student_class: '7A', stop_name: 'JLT Cluster T', status: 'present', pickup_time: '2026-06-23T07:30:00Z', route_name: 'Route A', date: '2026-06-23' },
  { id: 'att_003', trip_id: 'trp_001', student_id: 'std_005', student_name: 'Omar Abdullah Malik', student_class: '9A', status: 'absent', route_name: 'Route A', date: '2026-06-23' },
  { id: 'att_004', trip_id: 'trp_002', student_id: 'std_002', student_name: 'Fatima Noor Al-Zahra', student_class: '3B', stop_name: 'Jumeirah 1 Masjid', status: 'present', pickup_time: '2026-06-23T06:55:00Z', route_name: 'Route B', date: '2026-06-23' },
  { id: 'att_005', trip_id: 'trp_002', student_id: 'std_004', student_name: 'Aisha Rahman Siddiqui', student_class: '2C', status: 'leave', route_name: 'Route B', date: '2026-06-23' },
]

// ─── Leaves ───────────────────────────────────────────────────────────────────
export const mockLeaves: Leave[] = [
  { id: 'lv_001', student_id: 'std_004', student_name: 'Aisha Rahman Siddiqui', student_class: '2C', school_id: 'sch_001', from_date: '2026-06-23', to_date: '2026-06-24', reason: 'Family event', status: 'approved', approved_by: 'School Admin', approved_at: '2026-06-22T20:00:00Z', created_at: '2026-06-21T10:00:00Z' },
  { id: 'lv_002', student_id: 'std_007', student_name: 'Yousef Mahmoud Qassim', student_class: '4A', school_id: 'sch_001', from_date: '2026-06-25', to_date: '2026-06-25', reason: 'Medical appointment', status: 'pending', created_at: '2026-06-23T08:00:00Z' },
  { id: 'lv_003', student_id: 'std_008', student_name: 'Maryam Tariq Hussain', student_class: '8B', school_id: 'sch_001', from_date: '2026-06-26', to_date: '2026-06-27', reason: 'Travel', status: 'pending', created_at: '2026-06-23T09:30:00Z' },
  { id: 'lv_004', student_id: 'std_001', student_name: 'Ahmed Hassan Al-Rashid', student_class: '5A', school_id: 'sch_001', from_date: '2026-06-20', to_date: '2026-06-20', reason: 'Sick leave', status: 'rejected', approved_by: 'School Admin', approved_at: '2026-06-19T18:00:00Z', created_at: '2026-06-19T15:00:00Z' },
]

// ─── Lost & Found ─────────────────────────────────────────────────────────────
export const mockLostFound: LostFoundItem[] = [
  { id: 'lf_001', school_id: 'sch_001', bus_id: 'bus_001', bus_number: 'B-001', driver_id: 'drv_001', driver_name: 'Ali Mohammed', description: 'Blue school bag with water bottle, name tag: Ahmed H.', reported_at: '2026-06-22T15:35:00Z', status: 'reported', claims: [] },
  { id: 'lf_002', school_id: 'sch_001', bus_id: 'bus_002', bus_number: 'B-002', driver_id: 'drv_002', driver_name: 'Salim Ahmed', description: 'Grey lunch box with cartoon stickers, under seat 12', reported_at: '2026-06-21T14:50:00Z', status: 'claimed', claims: [{ id: 'lfc_001', lost_found_id: 'lf_002', student_id: 'std_002', student_name: 'Fatima Noor', claim_note: 'This is my lunch box', status: 'resolved', claimed_at: '2026-06-21T18:00:00Z' }] },
]

// ─── Notifications ────────────────────────────────────────────────────────────
export const mockNotifications: AppNotification[] = [
  { id: 'notif_001', title: 'Bus B-001 started pickup', body: 'Route A pickup trip has started. 28 students expected.', type: 'attendance', is_read: false, created_at: '2026-06-23T07:00:00Z' },
  { id: 'notif_002', title: 'Leave Request', body: 'Yousef Mahmoud has applied for leave on Jun 25', type: 'leave', is_read: false, created_at: '2026-06-23T08:05:00Z' },
  { id: 'notif_003', title: 'New Support Ticket', body: 'Driver Ali has raised support ticket #TKT-001', type: 'info', is_read: true, created_at: '2026-06-22T14:30:00Z' },
  { id: 'notif_004', title: 'Lost Item Reported', body: 'A blue school bag was reported on Bus B-001', type: 'warning', is_read: false, created_at: '2026-06-22T15:40:00Z' },
  { id: 'notif_005', title: 'Subscription Expiring', body: 'Your subscription expires in 7 days. Please renew.', type: 'warning', is_read: false, created_at: '2026-06-23T06:00:00Z' },
  { id: 'notif_006', title: '🚨 Emergency Alert', body: 'Bus B-003 reported breakdown on Sheikh Zayed Road', type: 'emergency', is_read: false, created_at: '2026-06-23T08:30:00Z' },
]

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const mockTickets: SupportTicket[] = [
  { id: 'TKT-001', school_id: 'sch_001', school_name: 'Al-Noor International School', reporter_id: 'drv_001', reporter_name: 'Ali Mohammed Al-Faris', reporter_role: 'driver', type: 'Technical Issue', priority: 'high', status: 'open', description: 'GPS not updating during morning trip. Location stuck.', created_at: '2026-06-23T07:45:00Z', replies: [] },
  { id: 'TKT-002', school_id: 'sch_002', school_name: 'Sunrise Academy', reporter_id: 'par_001', reporter_name: 'Ali Al-Zahra', reporter_role: 'parent', type: 'App Issue', priority: 'medium', status: 'in_progress', description: 'Cannot see live map on parent app. Button always disabled.', assigned_to: 'Support Team', created_at: '2026-06-22T10:00:00Z', replies: [{ id: 'rpl_001', ticket_id: 'TKT-002', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Looking into this. What is your app version?', created_at: '2026-06-22T11:00:00Z' }] },
  { id: 'TKT-003', school_id: 'sch_001', school_name: 'Al-Noor International School', reporter_id: 'sa_001', reporter_name: 'Hassan Al-Rashid', reporter_role: 'school_admin', type: 'Billing Query', priority: 'low', status: 'resolved', description: 'Need receipt for last month payment of $199.', created_at: '2026-06-20T14:00:00Z', replies: [{ id: 'rpl_002', ticket_id: 'TKT-003', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Receipt emailed. Please check your inbox.', created_at: '2026-06-20T15:00:00Z' }] },
]

// ─── Training Modules ─────────────────────────────────────────────────────────
export const mockTrainingModules: TrainingModule[] = [
  { id: 'trn_001', title: 'Getting Started with SmartTrack', description: 'Complete overview for school administrators.', video_url: 'https://www.youtube.com/embed/EngW7tLk6R8', target_role: 'school_admin', is_published: true, created_at: '2026-01-10T08:00:00Z', view_count: 145, duration_mins: 12 },
  { id: 'trn_002', title: 'Managing Students & Routes', description: 'How to add students and configure routes.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'school_admin', is_published: true, created_at: '2026-01-15T08:00:00Z', view_count: 98, duration_mins: 18 },
  { id: 'trn_003', title: 'Driver App Complete Guide', description: 'Start trips, mark attendance, handle emergencies.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'driver', is_published: true, created_at: '2026-01-20T08:00:00Z', view_count: 213, duration_mins: 15 },
  { id: 'trn_004', title: 'Parent App Guide', description: 'Track bus, apply for leave, set proximity alerts.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'parent', is_published: true, created_at: '2026-01-25T08:00:00Z', view_count: 312, duration_mins: 8 },
  { id: 'trn_005', title: 'Bus Transfer & Emergency Protocol', description: 'Handle bus breakdowns and initiate transfers.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'school_admin', is_published: true, created_at: '2026-02-01T08:00:00Z', view_count: 67, duration_mins: 10 },
  { id: 'trn_006', title: 'Guest Driver Mode', description: 'How to use Guest Driver login and QR scanning.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'driver', is_published: false, created_at: '2026-02-10T08:00:00Z', view_count: 0, duration_mins: 7 },
]

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const mockSubscriptions: Subscription[] = [
  { id: 'sub_001', school_id: 'sch_001', school_name: 'Al-Noor International School', plan_id: 'plan_premium', plan_name: 'Premium', start_date: '2025-09-01', end_date: '2026-08-31', amount_paid: 1910, payment_method: 'Bank Transfer', status: 'active' },
  { id: 'sub_002', school_id: 'sch_002', school_name: 'Sunrise Academy', plan_id: 'plan_standard', plan_name: 'Standard', start_date: '2025-10-15', end_date: '2026-10-14', amount_paid: 950, payment_method: 'Online', status: 'active' },
  { id: 'sub_003', school_id: 'sch_003', school_name: 'Green Valley School', plan_id: 'plan_standard', plan_name: 'Standard', start_date: '2026-01-10', end_date: '2027-01-09', amount_paid: 99, payment_method: 'Card', status: 'active' },
  { id: 'sub_004', school_id: 'sch_004', school_name: 'Bright Minds Institute', plan_id: 'plan_basic', plan_name: 'Basic', start_date: '2025-06-20', end_date: '2026-06-19', amount_paid: 49, payment_method: 'Cash', status: 'expired' },
  { id: 'sub_005', school_id: 'sch_005', school_name: 'Future Leaders School', plan_id: 'plan_basic', plan_name: 'Basic', start_date: '2026-03-05', end_date: '2027-03-04', amount_paid: 49, payment_method: 'Bank Transfer', status: 'suspended' },
]

// ─── Bus Transfers ────────────────────────────────────────────────────────────
export const mockBusTransfers: BusTransfer[] = [
  { id: 'bt_001', school_id: 'sch_001', original_trip_id: 'trp_001', original_bus_id: 'bus_003', original_bus_number: 'B-003', new_bus_id: 'bus_004', new_bus_number: 'B-004', new_driver_id: 'drv_003', new_driver_name: 'Ibrahim Yusuf Nasser', authorised_by: 'Hassan Al-Rashid', transfer_at: '2026-06-22T09:30:00Z', status: 'completed', reason: 'Bus breakdown on Sheikh Zayed Road', affected_students: 22 },
  { id: 'bt_002', school_id: 'sch_001', original_trip_id: 'trp_002', original_bus_id: 'bus_002', original_bus_number: 'B-002', new_bus_id: 'bus_003', new_bus_number: 'B-003', authorised_by: 'Hassan Al-Rashid', transfer_at: '2026-06-23T08:30:00Z', status: 'in_progress', reason: 'Bus tyre puncture near JLT', affected_students: 18 },
]

// ─── Guest Trips ──────────────────────────────────────────────────────────────
export const mockGuestTrips: GuestTrip[] = [
  { id: 'gt_001', school_id: 'sch_001', guest_driver_name: 'Khalid Mahmoud', guest_driver_phone: '+971551234600', bus_registration: 'DXB-A-12345', status: 'approved', approved_by: 'Hassan Al-Rashid', started_at: '2026-06-22T06:50:00Z', ended_at: '2026-06-22T07:35:00Z', students: [{ id: 'std_001', name: 'Ahmed Hassan', class: '5', division: 'A' }, { id: 'std_003', name: 'Mohammed Khalid', class: '7', division: 'A' }], created_at: '2026-06-22T06:30:00Z' },
  { id: 'gt_002', school_id: 'sch_001', guest_driver_name: 'Tariq Bilal', guest_driver_phone: '+971551234601', bus_registration: 'DXB-B-67890', status: 'pending_approval', students: [{ id: 'std_002', name: 'Fatima Noor', class: '3', division: 'B' }, { id: 'std_004', name: 'Aisha Rahman', class: '2', division: 'C' }], created_at: '2026-06-23T06:45:00Z' },
]

// ─── Messages ─────────────────────────────────────────────────────────────────
export const mockMessages: Message[] = [
  { id: 'msg_001', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'Dear Parents, tomorrow is a half day. Buses will depart at 12:00 PM.', sent_at: '2026-06-22T16:00:00Z' },
  { id: 'msg_002', school_id: 'sch_001', sender_id: 'drv_001', sender_name: 'Ali Mohammed Al-Faris', sender_role: 'driver', recipient_type: 'admin', content: 'Heavy traffic near JLT. Will be 10 minutes late.', sent_at: '2026-06-23T07:20:00Z' },
]

// ─── Revenue Chart Data ───────────────────────────────────────────────────────
export const mockRevenueData = [
  { month: 'Jul 25', revenue: 8200, schools: 42 },
  { month: 'Aug 25', revenue: 9100, schools: 46 },
  { month: 'Sep 25', revenue: 12400, schools: 62 },
  { month: 'Oct 25', revenue: 11800, schools: 58 },
  { month: 'Nov 25', revenue: 13200, schools: 66 },
  { month: 'Dec 25', revenue: 10500, schools: 52 },
  { month: 'Jan 26', revenue: 14800, schools: 74 },
  { month: 'Feb 26', revenue: 15600, schools: 78 },
  { month: 'Mar 26', revenue: 16200, schools: 81 },
  { month: 'Apr 26', revenue: 17400, schools: 87 },
  { month: 'May 26', revenue: 18900, schools: 94 },
  { month: 'Jun 26', revenue: 19800, schools: 99 },
]

// ─── Attendance Trend ─────────────────────────────────────────────────────────
export const mockAttendanceTrend = Array.from({ length: 30 }, (_, i) => ({
  date: `Jun ${i + 1}`,
  present: 180 + Math.floor(Math.random() * 40),
  absent: 10 + Math.floor(Math.random() * 20),
  leave: 5 + Math.floor(Math.random() * 10),
}))

// ─── Extended Mock Data ───────────────────────────────────────────────────────
// Extra schools to reach 8 total (sch_001–sch_008 already defined above;
// Ethiopian schools added below as sch_009–sch_016 aliases so consumers can
// import either set — or use ALL_SCHOOLS which merges both)

export const mockEthiopianSchools: School[] = [
  { id: 'sch_eth_01', name: 'Addis International Academy', address: 'Bole Road, near Edna Mall', city: 'Addis Ababa', state: 'Addis Ababa', phone: '+251911234567', email: 'admin@addisintl.edu.et', plan_id: 'plan_premium', plan_name: 'Premium', status: 'active', subdomain: 'addisintl', student_count: 740, driver_count: 18, bus_count: 14, route_count: 12, admin_name: 'Selam Bekele', admin_email: 'selam.bekele@addisintl.edu.et', created_at: '2023-03-10T08:00:00Z' },
  { id: 'sch_eth_02', name: 'Al-Huda Islamic School', address: 'Merkato Area, Addis Ababa', city: 'Addis Ababa', state: 'Addis Ababa', phone: '+251922345678', email: 'info@alhuda.edu.et', plan_id: 'plan_standard', plan_name: 'Standard', status: 'active', subdomain: 'alhuda', student_count: 410, driver_count: 10, bus_count: 9, route_count: 8, admin_name: 'Mohammed Al-Amin', admin_email: 'mohammed@alhuda.edu.et', created_at: '2023-05-22T08:00:00Z' },
  { id: 'sch_eth_03', name: 'Hawassa Excellence School', address: 'Main Street, near Lake Hawassa', city: 'Hawassa', state: 'Sidama', phone: '+251933456789', email: 'admin@hawassaexcel.edu.et', plan_id: 'plan_standard', plan_name: 'Standard', status: 'active', subdomain: 'hawassaexcel', student_count: 320, driver_count: 8, bus_count: 7, route_count: 6, admin_name: 'Tigist Haile', admin_email: 'tigist@hawassaexcel.edu.et', created_at: '2023-07-01T08:00:00Z' },
  { id: 'sch_eth_04', name: 'Bahir Dar Sunrise Academy', address: 'Lake Tana Road, Bahir Dar', city: 'Bahir Dar', state: 'Amhara', phone: '+251944567890', email: 'contact@sunriseacademy.edu.et', plan_id: 'plan_basic', plan_name: 'Basic', status: 'active', subdomain: 'sunrisebd', student_count: 180, driver_count: 4, bus_count: 4, route_count: 3, admin_name: 'Abebe Girma', admin_email: 'abebe@sunriseacademy.edu.et', created_at: '2023-09-15T08:00:00Z' },
  { id: 'sch_eth_05', name: 'Jimma Valley Academy', address: 'Stadium Road, Jimma', city: 'Jimma', state: 'Oromia', phone: '+251955678901', email: 'info@jimmavalley.edu.et', plan_id: 'plan_basic', plan_name: 'Basic', status: 'suspended', subdomain: 'jimmavalley', student_count: 135, driver_count: 3, bus_count: 3, route_count: 2, admin_name: 'Dawit Tadesse', admin_email: 'dawit@jimmavalley.edu.et', created_at: '2023-11-20T08:00:00Z' },
  { id: 'sch_eth_06', name: 'Mekelle Modern School', address: 'Adi Haqi, Mekelle', city: 'Mekelle', state: 'Tigray', phone: '+251966789012', email: 'admin@mekellemod.edu.et', plan_id: 'plan_standard', plan_name: 'Standard', status: 'active', subdomain: 'mekellemod', student_count: 290, driver_count: 7, bus_count: 6, route_count: 5, admin_name: 'Hiwot Tesfaye', admin_email: 'hiwot@mekellemod.edu.et', created_at: '2024-01-08T08:00:00Z' },
  { id: 'sch_eth_07', name: 'Dire Dawa Pioneer School', address: 'Sabian Area, Dire Dawa', city: 'Dire Dawa', state: 'Dire Dawa', phone: '+251977890123', email: 'pioneer@ddpioneer.edu.et', plan_id: 'plan_basic', plan_name: 'Basic', status: 'pending', subdomain: 'ddpioneer', student_count: 95, driver_count: 2, bus_count: 2, route_count: 2, admin_name: 'Fatuma Abdirahman', admin_email: 'fatuma@ddpioneer.edu.et', created_at: '2024-03-12T08:00:00Z' },
  { id: 'sch_eth_08', name: 'Adama Smart School', address: 'Bekele Mola Road, Adama', city: 'Adama', state: 'Oromia', phone: '+251988901234', email: 'info@adamasmart.edu.et', plan_id: 'plan_premium', plan_name: 'Premium', status: 'active', subdomain: 'adamasmart', student_count: 560, driver_count: 14, bus_count: 12, route_count: 10, admin_name: 'Yohannes Mulugeta', admin_email: 'yohannes@adamasmart.edu.et', created_at: '2024-02-20T08:00:00Z' },
]

// Extended drivers to reach 10 total
export const mockExtraDrivers: Driver[] = [
  { id: 'drv_005', school_id: 'sch_001', name: 'Kebede Alemu Tadesse', employee_id: 'EMP005', email: 'kebede@alnoor.ae', phone: '+971551234505', whatsapp: '+971551234505', license_number: 'DXB-LIC-78905', license_expiry: '2026-08-15', is_active: true, assigned_bus_id: 'bus_005', assigned_bus_number: 'B-005', created_at: '2024-11-01T08:00:00Z' },
  { id: 'drv_006', school_id: 'sch_002', name: 'Yusuf Ibrahim Mohammed', employee_id: 'EMP006', email: 'yusuf@sunrise.ae', phone: '+971551234506', whatsapp: '+971551234506', license_number: 'AUH-LIC-22001', license_expiry: '2027-03-10', is_active: true, created_at: '2024-10-15T08:00:00Z' },
  { id: 'drv_007', school_id: 'sch_002', name: 'Tesfaye Wolde Gebre', employee_id: 'EMP007', email: 'tesfaye@sunrise.ae', phone: '+971551234507', whatsapp: '+971551234507', license_number: 'AUH-LIC-22002', license_expiry: '2026-05-20', is_active: true, created_at: '2024-10-15T08:00:00Z' },
  { id: 'drv_008', school_id: 'sch_003', name: 'Abdirahman Warsame Ali', employee_id: 'EMP008', email: 'abdirahman@greenvalley.ae', phone: '+971551234508', whatsapp: '+971551234508', license_number: 'SHJ-LIC-33001', license_expiry: '2025-09-25', is_active: true, created_at: '2025-01-10T08:00:00Z' },
  { id: 'drv_009', school_id: 'sch_004', name: 'Omar Abdullah Salim', employee_id: 'EMP009', email: 'omar.drv@brightminds.ae', phone: '+971551234509', whatsapp: '+971551234509', license_number: 'AJM-LIC-44001', license_expiry: '2027-06-30', is_active: true, created_at: '2025-02-20T08:00:00Z' },
  { id: 'drv_010', school_id: 'sch_006', name: 'Girma Tadesse Bekele', employee_id: 'EMP010', email: 'girma@starint.ae', phone: '+971551234510', whatsapp: '+971551234510', license_number: 'RAK-LIC-55001', license_expiry: '2028-02-18', is_active: true, created_at: '2024-08-12T08:00:00Z' },
]

// Extended buses to reach 10 total
export const mockExtraBuses: Bus[] = [
  { id: 'bus_005', school_id: 'sch_001', bus_number: 'B-005', seat_capacity: 45, make_model: 'Isuzu NQR 2022', year: 2022, insurance_expiry: '2026-09-10', fitness_cert_expiry: '2026-09-10', is_active: true, driver_id: 'drv_005', driver_name: 'Kebede Alemu Tadesse', status: 'running', current_stop: 'Discovery Gardens', created_at: '2024-11-01T08:00:00Z' },
  { id: 'bus_006', school_id: 'sch_002', bus_number: 'B-006', seat_capacity: 40, make_model: 'Toyota Coaster 2020', year: 2020, insurance_expiry: '2025-10-20', fitness_cert_expiry: '2025-10-20', is_active: true, driver_id: 'drv_006', driver_name: 'Yusuf Ibrahim Mohammed', status: 'idle', created_at: '2024-10-15T08:00:00Z' },
  { id: 'bus_007', school_id: 'sch_003', bus_number: 'B-007', seat_capacity: 35, make_model: 'Mitsubishi Rosa 2023', year: 2023, insurance_expiry: '2027-03-15', fitness_cert_expiry: '2027-03-15', is_active: true, driver_id: 'drv_008', driver_name: 'Abdirahman Warsame Ali', status: 'running', current_stop: 'Sharjah University City', created_at: '2025-01-10T08:00:00Z' },
  { id: 'bus_008', school_id: 'sch_004', bus_number: 'B-008', seat_capacity: 30, make_model: 'Toyota Coaster 2019', year: 2019, insurance_expiry: '2025-08-05', fitness_cert_expiry: '2025-07-15', is_active: true, driver_id: 'drv_009', driver_name: 'Omar Abdullah Salim', status: 'idle', created_at: '2025-02-20T08:00:00Z' },
  { id: 'bus_009', school_id: 'sch_006', bus_number: 'B-009', seat_capacity: 50, make_model: 'Isuzu NQR 2023', year: 2023, insurance_expiry: '2027-08-25', fitness_cert_expiry: '2027-08-25', is_active: true, driver_id: 'drv_010', driver_name: 'Girma Tadesse Bekele', status: 'running', current_stop: 'RAK Free Zone', created_at: '2024-08-12T08:00:00Z' },
  { id: 'bus_010', school_id: 'sch_001', bus_number: 'B-010', seat_capacity: 45, make_model: 'Rosa Mitsubishi 2024', year: 2024, insurance_expiry: '2027-12-31', fitness_cert_expiry: '2027-12-31', is_active: false, status: 'offline', created_at: '2024-12-01T08:00:00Z' },
]

// Extended routes to reach 6 total
export const mockExtraRoutes: Route[] = [
  { id: 'rte_004', school_id: 'sch_001', bus_id: 'bus_005', bus_number: 'B-005', name: 'Route D - Pickup', type: 'pickup', start_point: 'Discovery Gardens', end_point: 'Al-Noor School', route_qr_code: 'QR_RTE_004', is_active: true, student_count: 30, driver_id: 'drv_005', driver_name: 'Kebede Alemu Tadesse', stops: [makeStop('rte_004', 'Discovery Gardens Metro', 25.0530, 55.1408, 1, '7:05 AM'), makeStop('rte_004', 'Ibn Battuta Mall', 25.0580, 55.1461, 2, '7:20 AM'), makeStop('rte_004', 'Al-Noor School', 25.0590, 55.1700, 3, '7:40 AM')], created_at: '2024-11-01T08:00:00Z' },
  { id: 'rte_005', school_id: 'sch_002', bus_id: 'bus_006', bus_number: 'B-006', name: 'Abu Dhabi North Route', type: 'pickup', start_point: 'Khalidiyah', end_point: 'Sunrise Academy', route_qr_code: 'QR_RTE_005', is_active: true, student_count: 18, driver_id: 'drv_006', driver_name: 'Yusuf Ibrahim Mohammed', stops: [makeStop('rte_005', 'Khalidiyah Garden', 24.4792, 54.3490, 1, '6:45 AM'), makeStop('rte_005', 'Corniche Hospital', 24.4880, 54.3580, 2, '7:00 AM'), makeStop('rte_005', 'Sunrise Academy', 24.4950, 54.3700, 3, '7:15 AM')], created_at: '2024-10-15T08:00:00Z' },
  { id: 'rte_006', school_id: 'sch_003', bus_id: 'bus_007', bus_number: 'B-007', name: 'Sharjah Central Route', type: 'pickup', start_point: 'Al Nahda', end_point: 'Green Valley School', route_qr_code: 'QR_RTE_006', is_active: true, student_count: 24, driver_id: 'drv_008', driver_name: 'Abdirahman Warsame Ali', stops: [makeStop('rte_006', 'Al Nahda Park', 25.3021, 55.4020, 1, '6:50 AM'), makeStop('rte_006', 'Al Majaz Waterfront', 25.3320, 55.3870, 2, '7:08 AM'), makeStop('rte_006', 'Green Valley School', 25.3550, 55.3700, 3, '7:25 AM')], created_at: '2025-01-10T08:00:00Z' },
]

// Extended trips to reach 5 total
export const mockExtraTrips: Trip[] = [
  { id: 'trp_004', route_id: 'rte_004', route_name: 'Route D - Pickup', driver_id: 'drv_005', driver_name: 'Kebede Alemu Tadesse', bus_id: 'bus_005', bus_number: 'B-005', trip_type: 'pickup', status: 'in_progress', started_at: '2026-06-23T07:05:00Z', student_count: 30 },
  { id: 'trp_005', route_id: 'rte_005', route_name: 'Abu Dhabi North Route', driver_id: 'drv_006', driver_name: 'Yusuf Ibrahim Mohammed', bus_id: 'bus_006', bus_number: 'B-006', trip_type: 'pickup', status: 'completed', started_at: '2026-06-23T06:48:00Z', ended_at: '2026-06-23T07:18:00Z', student_count: 18 },
]

// Extended students to reach 20 total
const mp = (sid: string, name: string, rel: string, email: string, phone: string): import('@/types').ParentDetail => ({
  id: `par_ext_${sid}`, student_id: sid, parent_name: name, relationship: rel, email, phone, whatsapp: phone,
})

export const mockExtraStudents: Student[] = [
  { id: 'std_009', school_id: 'sch_001', name: 'Naol Kebede Haile', class: '6', division: 'A', roll_number: '601A', dob: '2014-03-10', is_active: true, route_name: 'Route A - Pickup', parents: [mp('std_009', 'Kebede Haile Girma', 'Father', 'kebede.haile@gmail.com', '+971501234580')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_010', school_id: 'sch_001', name: 'Liya Tesfaye Wolde', class: '4', division: 'B', roll_number: '401B', dob: '2016-08-22', is_active: true, route_name: 'Route B - Pickup', parents: [mp('std_010', 'Tesfaye Wolde Bekele', 'Father', 'tesfaye.wolde@gmail.com', '+971501234581')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_011', school_id: 'sch_002', name: 'Amira Hassan Mohammed', class: '5', division: 'A', roll_number: '501AA', dob: '2015-06-14', is_active: true, route_name: 'Abu Dhabi North Route', parents: [mp('std_011', 'Hassan Mohammed Al-Zaidi', 'Father', 'hassan.zaidi@gmail.com', '+971501234582')], created_at: '2024-10-15T08:00:00Z' },
  { id: 'std_012', school_id: 'sch_002', name: 'Khalid Ibrahim Al-Amin', class: '7', division: 'B', roll_number: '701AB', dob: '2013-01-30', is_active: true, route_name: 'Abu Dhabi North Route', parents: [mp('std_012', 'Ibrahim Al-Amin Saleh', 'Father', 'ibrahim.amin@gmail.com', '+971501234583')], created_at: '2024-10-15T08:00:00Z' },
  { id: 'std_013', school_id: 'sch_003', name: 'Biruk Alemu Demissie', class: '3', division: 'A', roll_number: '301CA', dob: '2017-09-05', is_active: true, route_name: 'Sharjah Central Route', parents: [mp('std_013', 'Alemu Demissie Teshome', 'Father', 'alemu.d@gmail.com', '+971501234584')], created_at: '2025-01-10T08:00:00Z' },
  { id: 'std_014', school_id: 'sch_003', name: 'Meron Girma Tadesse', class: '8', division: 'C', roll_number: '801CC', dob: '2012-11-18', is_active: true, route_name: 'Sharjah Central Route', parents: [mp('std_014', 'Girma Tadesse Alemu', 'Father', 'girma.ta@gmail.com', '+971501234585')], created_at: '2025-01-10T08:00:00Z' },
  { id: 'std_015', school_id: 'sch_004', name: 'Rahma Abdulkadir Nur', class: '2', division: 'A', roll_number: '201DA', dob: '2018-04-01', is_active: true, parents: [mp('std_015', 'Abdulkadir Nur Mohammed', 'Father', 'abdulkadir.nur@gmail.com', '+971501234586')], created_at: '2025-02-20T08:00:00Z' },
  { id: 'std_016', school_id: 'sch_001', name: 'Yonas Solomon Getachew', class: '10', division: 'A', roll_number: '1001A', dob: '2010-07-07', is_active: true, route_name: 'Route A - Pickup', parents: [mp('std_016', 'Solomon Getachew Mekonen', 'Father', 'solomon.g@gmail.com', '+971501234587')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_017', school_id: 'sch_006', name: 'Nardos Hailu Bekele', class: '9', division: 'B', roll_number: '901RA', dob: '2011-02-14', is_active: true, parents: [mp('std_017', 'Hailu Bekele Tesfaye', 'Father', 'hailu.b@gmail.com', '+971501234588')], created_at: '2024-08-12T08:00:00Z' },
  { id: 'std_018', school_id: 'sch_006', name: 'Aisha Omar Abdullah', class: '6', division: 'A', roll_number: '601RA', dob: '2014-12-25', is_active: true, parents: [mp('std_018', 'Omar Abdullah Hassan', 'Father', 'omar.ah@gmail.com', '+971501234589'), mp('std_018', 'Zahra Salim Noor', 'Mother', 'zahra.sn@gmail.com', '+971501234590')], created_at: '2024-08-12T08:00:00Z' },
  { id: 'std_019', school_id: 'sch_001', name: 'Hana Melaku Assefa', class: '1', division: 'A', roll_number: '101AA', dob: '2019-08-15', is_active: false, route_name: 'Route D - Pickup', parents: [mp('std_019', 'Melaku Assefa Girma', 'Father', 'melaku.a@gmail.com', '+971501234591')], created_at: '2024-09-01T08:00:00Z' },
  { id: 'std_020', school_id: 'sch_008', name: 'Dawit Tesfaye Mulugeta', class: '5', division: 'C', roll_number: '501PC', dob: '2015-05-28', is_active: true, parents: [mp('std_020', 'Tesfaye Mulugeta Haile', 'Father', 'tesfaye.mh@gmail.com', '+971501234592'), mp('std_020', 'Tigist Alemu Bekele', 'Mother', 'tigist.ab@gmail.com', '+971501234593')], created_at: '2024-07-01T08:00:00Z' },
]

// Extended attendance to reach 50 total (existing 5 + 45 more)
export const mockExtraAttendance: AttendanceRecord[] = (() => {
  const extras: AttendanceRecord[] = []
  const statuses: AttendanceRecord['status'][] = ['present', 'present', 'present', 'absent', 'leave']
  const dates = ['2026-06-20', '2026-06-21', '2026-06-22']
  const students = [
    { id: 'std_001', name: 'Ahmed Hassan Al-Rashid', cls: '5A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_002', name: 'Fatima Noor Al-Zahra', cls: '3B', trip: 'trp_002', route: 'Route B' },
    { id: 'std_003', name: 'Mohammed Khalid Ibrahim', cls: '7A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_005', name: 'Omar Abdullah Malik', cls: '9A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_007', name: 'Yousef Mahmoud Qassim', cls: '4A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_008', name: 'Maryam Tariq Hussain', cls: '8B', trip: 'trp_002', route: 'Route B' },
    { id: 'std_009', name: 'Naol Kebede Haile', cls: '6A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_010', name: 'Liya Tesfaye Wolde', cls: '4B', trip: 'trp_002', route: 'Route B' },
    { id: 'std_011', name: 'Amira Hassan Mohammed', cls: '5A', trip: 'trp_005', route: 'Abu Dhabi North' },
    { id: 'std_012', name: 'Khalid Ibrahim Al-Amin', cls: '7B', trip: 'trp_005', route: 'Abu Dhabi North' },
    { id: 'std_016', name: 'Yonas Solomon Getachew', cls: '10A', trip: 'trp_001', route: 'Route A' },
    { id: 'std_020', name: 'Dawit Tesfaye Mulugeta', cls: '5C', trip: 'trp_001', route: 'Route A' },
    { id: 'std_013', name: 'Biruk Alemu Demissie', cls: '3A', trip: 'trp_004', route: 'Route D' },
    { id: 'std_014', name: 'Meron Girma Tadesse', cls: '8C', trip: 'trp_004', route: 'Route D' },
    { id: 'std_017', name: 'Nardos Hailu Bekele', cls: '9B', trip: 'trp_005', route: 'Route A' },
  ]
  let idx = 0
  for (const date of dates) {
    for (const stu of students) {
      const status = statuses[idx % statuses.length]
      extras.push({
        id: `att_ext_${String(extras.length + 1).padStart(3, '0')}`,
        trip_id: stu.trip,
        student_id: stu.id,
        student_name: stu.name,
        student_class: stu.cls,
        status,
        pickup_time: status === 'present' ? `${date}T07:20:00Z` : undefined,
        drop_time: status === 'present' ? `${date}T15:50:00Z` : undefined,
        route_name: stu.route,
        date,
      })
      idx++
    }
  }
  return extras
})()

// Extended leaves to reach 15 total (existing 4 + 11 more)
export const mockExtraLeaves: Leave[] = [
  { id: 'lv_005', student_id: 'std_001', student_name: 'Ahmed Hassan Al-Rashid', student_class: '5A', school_id: 'sch_001', from_date: '2026-06-25', to_date: '2026-06-25', reason: 'Medical appointment', status: 'pending', created_at: '2026-06-23T10:00:00Z' },
  { id: 'lv_006', student_id: 'std_003', student_name: 'Mohammed Khalid Ibrahim', student_class: '7A', school_id: 'sch_001', from_date: '2026-06-26', to_date: '2026-06-27', reason: 'Family event', status: 'approved', approved_by: 'Hassan Al-Rashid', approved_at: '2026-06-23T11:00:00Z', created_at: '2026-06-23T09:30:00Z' },
  { id: 'lv_007', student_id: 'std_011', student_name: 'Amira Hassan Mohammed', student_class: '5A', school_id: 'sch_002', from_date: '2026-06-24', to_date: '2026-06-24', reason: 'Sick leave', status: 'approved', approved_by: 'Fatima Al-Zahra', approved_at: '2026-06-23T08:30:00Z', created_at: '2026-06-23T08:00:00Z' },
  { id: 'lv_008', student_id: 'std_012', student_name: 'Khalid Ibrahim Al-Amin', student_class: '7B', school_id: 'sch_002', from_date: '2026-06-28', to_date: '2026-06-30', reason: 'Travel', status: 'pending', created_at: '2026-06-23T12:00:00Z' },
  { id: 'lv_009', student_id: 'std_009', student_name: 'Naol Kebede Haile', student_class: '6A', school_id: 'sch_001', from_date: '2026-06-23', to_date: '2026-06-23', reason: 'Sick leave', status: 'approved', approved_by: 'Hassan Al-Rashid', approved_at: '2026-06-22T21:00:00Z', created_at: '2026-06-22T20:00:00Z' },
  { id: 'lv_010', student_id: 'std_013', student_name: 'Biruk Alemu Demissie', student_class: '3A', school_id: 'sch_003', from_date: '2026-06-25', to_date: '2026-06-26', reason: 'School function', status: 'pending', created_at: '2026-06-23T13:00:00Z' },
  { id: 'lv_011', student_id: 'std_016', student_name: 'Yonas Solomon Getachew', student_class: '10A', school_id: 'sch_001', from_date: '2026-06-30', to_date: '2026-07-02', reason: 'Travel', status: 'approved', approved_by: 'Hassan Al-Rashid', approved_at: '2026-06-23T14:00:00Z', created_at: '2026-06-23T13:30:00Z' },
  { id: 'lv_012', student_id: 'std_017', student_name: 'Nardos Hailu Bekele', student_class: '9B', school_id: 'sch_006', from_date: '2026-06-24', to_date: '2026-06-25', reason: 'Medical appointment', status: 'rejected', approved_by: 'Noor Hussain', approved_at: '2026-06-23T09:00:00Z', created_at: '2026-06-23T08:30:00Z' },
  { id: 'lv_013', student_id: 'std_018', student_name: 'Aisha Omar Abdullah', student_class: '6A', school_id: 'sch_006', from_date: '2026-06-27', to_date: '2026-06-27', reason: 'Personal reasons', status: 'pending', created_at: '2026-06-23T15:00:00Z' },
  { id: 'lv_014', student_id: 'std_020', student_name: 'Dawit Tesfaye Mulugeta', student_class: '5C', school_id: 'sch_008', from_date: '2026-07-01', to_date: '2026-07-03', reason: 'Family event', status: 'approved', approved_by: 'Layla Hassan', approved_at: '2026-06-23T10:00:00Z', created_at: '2026-06-23T09:30:00Z' },
  { id: 'lv_015', student_id: 'std_005', student_name: 'Omar Abdullah Malik', student_class: '9A', school_id: 'sch_001', from_date: '2026-06-20', to_date: '2026-06-21', reason: 'Sick leave', status: 'approved', approved_by: 'Hassan Al-Rashid', approved_at: '2026-06-19T20:00:00Z', created_at: '2026-06-19T19:00:00Z' },
]

// Extended lost & found to reach 8 total (existing 2 + 6 more)
export const mockExtraLostFound: LostFoundItem[] = [
  { id: 'lf_003', school_id: 'sch_001', bus_id: 'bus_003', bus_number: 'B-003', driver_id: 'drv_003', driver_name: 'Ibrahim Yusuf Nasser', description: 'Black umbrella with red handle found near exit door.', reported_at: '2026-06-21T15:00:00Z', status: 'reported', claims: [] },
  { id: 'lf_004', school_id: 'sch_001', bus_id: 'bus_001', bus_number: 'B-001', driver_id: 'drv_001', driver_name: 'Ali Mohammed Al-Faris', description: 'Mathematics textbook Grade 7, no name written inside.', reported_at: '2026-06-20T14:30:00Z', status: 'reported', claims: [] },
  { id: 'lf_005', school_id: 'sch_002', bus_id: 'bus_006', bus_number: 'B-006', driver_id: 'drv_006', driver_name: 'Yusuf Ibrahim Mohammed', description: 'Spectacles in brown leather case, found on rear seat.', reported_at: '2026-06-22T16:00:00Z', status: 'reported', claims: [] },
  { id: 'lf_006', school_id: 'sch_003', bus_id: 'bus_007', bus_number: 'B-007', driver_id: 'drv_008', driver_name: 'Abdirahman Warsame Ali', description: 'PE kit bag (white) with football boots inside.', reported_at: '2026-06-23T07:50:00Z', status: 'reported', claims: [] },
  { id: 'lf_007', school_id: 'sch_001', bus_id: 'bus_002', bus_number: 'B-002', driver_id: 'drv_002', driver_name: 'Salim Ahmed Rashid', description: 'Blue jacket (size small), found on seat 8. Has school badge.', reported_at: '2026-06-19T16:00:00Z', status: 'claimed', claims: [{ id: 'lfc_002', lost_found_id: 'lf_007', student_id: 'std_002', student_name: 'Fatima Noor Al-Zahra', claim_note: 'This is my daughters jacket', status: 'pending', claimed_at: '2026-06-20T09:00:00Z' }] },
  { id: 'lf_008', school_id: 'sch_006', bus_id: 'bus_009', bus_number: 'B-009', driver_id: 'drv_010', driver_name: 'Girma Tadesse Bekele', description: 'Small Quran in green velvet cover, found under front seat.', reported_at: '2026-06-23T07:10:00Z', status: 'reported', claims: [] },
]

// Extended messages to reach 20 total (existing 2 + 18 more)
export const mockExtraMessages: Message[] = [
  { id: 'msg_003', school_id: 'sch_001', sender_id: 'drv_001', sender_name: 'Ali Mohammed Al-Faris', sender_role: 'driver', recipient_type: 'admin', content: 'Bus B-001 has a tyre warning light on. Will complete this trip and report to maintenance.', sent_at: '2026-06-23T07:10:00Z', read_at: '2026-06-23T07:12:00Z' },
  { id: 'msg_004', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'route_parents', recipient_id: 'rte_001', recipient_name: 'Route A - Pickup', content: 'Route A parents: slight delay of 10 minutes due to morning traffic on Sheikh Zayed Road. Students are safe onboard.', sent_at: '2026-06-23T07:25:00Z' },
  { id: 'msg_005', school_id: 'sch_002', sender_id: 'sa_002', sender_name: 'Fatima Al-Zahra', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'Sunrise Academy: This Friday is a public holiday. No bus service on Friday June 27. Regular service resumes Monday.', sent_at: '2026-06-22T11:00:00Z' },
  { id: 'msg_006', school_id: 'sch_001', sender_id: 'par_std_001', sender_name: 'Hassan Al-Rashid', sender_role: 'parent', recipient_type: 'admin', content: 'Ahmed will not be taking the bus on June 25 due to a medical appointment. Leave has been submitted.', sent_at: '2026-06-23T10:05:00Z' },
  { id: 'msg_007', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'individual', recipient_id: 'drv_002', recipient_name: 'Salim Ahmed Rashid', content: 'Salim, bus B-002 fitness certificate expires in 10 days. Please schedule the inspection this week.', sent_at: '2026-06-22T10:00:00Z', read_at: '2026-06-22T12:00:00Z' },
  { id: 'msg_008', school_id: 'sch_001', sender_id: 'drv_002', sender_name: 'Salim Ahmed Rashid', sender_role: 'driver', recipient_type: 'admin', content: 'Noted. I have booked the inspection for Thursday June 26 at 9 AM at the RTA centre.', sent_at: '2026-06-22T12:30:00Z', read_at: '2026-06-22T13:00:00Z' },
  { id: 'msg_009', school_id: 'sch_003', sender_id: 'sa_003', sender_name: 'Mohammed Khalid', sender_role: 'school_admin', recipient_type: 'all_drivers', content: 'Green Valley drivers: Please ensure all students scan their QR codes at every stop. Attendance compliance is at 84% — target is 95%.', sent_at: '2026-06-23T08:00:00Z' },
  { id: 'msg_010', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'End of term: Last day of school is June 30. Buses will depart at 12:00 noon. Parents please be at stops by 11:45 AM.', sent_at: '2026-06-20T14:00:00Z' },
  { id: 'msg_011', school_id: 'sch_001', sender_id: 'drv_005', sender_name: 'Kebede Alemu Tadesse', sender_role: 'driver', recipient_type: 'admin', content: 'Route D all 30 students picked up. On my way to school. ETA 7 minutes.', sent_at: '2026-06-23T07:33:00Z', read_at: '2026-06-23T07:34:00Z' },
  { id: 'msg_012', school_id: 'sch_002', sender_id: 'par_std_011', sender_name: 'Hassan Mohammed Al-Zaidi', sender_role: 'parent', recipient_type: 'admin', content: 'Amira is feeling better and will be on the bus tomorrow. Thank you for the approved leave.', sent_at: '2026-06-23T19:00:00Z' },
  { id: 'msg_013', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'individual', recipient_id: 'par_std_001', recipient_name: 'Hassan Al-Rashid', content: "Ahmed's leave request for June 25 has been approved. No bus service needed that day. Thank you.", sent_at: '2026-06-23T11:00:00Z', read_at: '2026-06-23T11:30:00Z' },
  { id: 'msg_014', school_id: 'sch_006', sender_id: 'sa_006', sender_name: 'Noor Hussain', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'Star International Academy: New drop-off point added at RAK Corniche from July 1. Please update your preferences in the parent app.', sent_at: '2026-06-23T09:30:00Z' },
  { id: 'msg_015', school_id: 'sch_001', sender_id: 'drv_003', sender_name: 'Ibrahim Yusuf Nasser', sender_role: 'driver', recipient_type: 'admin', content: 'No trip today for Bus B-003 — vehicle is in the garage for the earlier transfer. Please confirm if I should cover Route A instead.', sent_at: '2026-06-23T06:30:00Z', read_at: '2026-06-23T06:45:00Z' },
  { id: 'msg_016', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'individual', recipient_id: 'drv_003', recipient_name: 'Ibrahim Yusuf Nasser', content: 'Ibrahim, please stand by at school. We may need you for the return drop route if the transfer is not complete by noon.', sent_at: '2026-06-23T06:50:00Z', read_at: '2026-06-23T06:55:00Z' },
  { id: 'msg_017', school_id: 'sch_004', sender_id: 'sa_004', sender_name: 'Aisha Rahman', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'Bright Minds Institute: Parent-teacher meetings are scheduled for July 3. School bus will operate normal morning service but there will be no afternoon bus.', sent_at: '2026-06-23T10:00:00Z' },
  { id: 'msg_018', school_id: 'sch_001', sender_id: 'par_std_016', sender_name: 'Solomon Getachew Mekonen', sender_role: 'parent', recipient_type: 'admin', content: 'Can you please confirm Yonas is onboard Bus B-001? He left home but we have not received the boarding confirmation.', sent_at: '2026-06-23T07:08:00Z' },
  { id: 'msg_019', school_id: 'sch_001', sender_id: 'sa_001', sender_name: 'Hassan Al-Rashid', sender_role: 'school_admin', recipient_type: 'individual', recipient_id: 'par_std_016', recipient_name: 'Solomon Getachew Mekonen', content: 'Yonas is confirmed onboard Bus B-001 and will arrive at school by 7:45 AM. The push notification may be delayed — we are looking into it.', sent_at: '2026-06-23T07:15:00Z', read_at: '2026-06-23T07:20:00Z' },
  { id: 'msg_020', school_id: 'sch_008', sender_id: 'sa_008', sender_name: 'Layla Hassan', sender_role: 'school_admin', recipient_type: 'all_parents', content: 'Pioneer Institute: Bus schedule updated for July — please download the latest version of the parent app to see the new timetable.', sent_at: '2026-06-23T11:00:00Z' },
]

// Extended notifications to reach 30 total (existing 6 + 24 more)
export const mockExtraNotifications: AppNotification[] = [
  { id: 'notif_007', school_id: 'sch_001', title: 'Leave Approved', body: 'Naol Kebede Haile leave for June 23 approved by Hassan Al-Rashid.', type: 'leave', is_read: true, created_at: '2026-06-22T21:05:00Z' },
  { id: 'notif_008', school_id: 'sch_001', title: 'Tyre Warning', body: 'Driver Ali Mohammed reported tyre warning light on Bus B-001.', type: 'warning', is_read: false, created_at: '2026-06-23T07:10:00Z' },
  { id: 'notif_009', title: 'New School Registered', body: 'Excellence School (Dubai) has registered and awaits approval.', type: 'system', is_read: false, created_at: '2026-06-20T08:05:00Z' },
  { id: 'notif_010', school_id: 'sch_001', title: 'Trip Completed', body: 'Route A – Drop trip completed. All 25 students dropped safely.', type: 'success', is_read: true, created_at: '2026-06-22T15:35:00Z' },
  { id: 'notif_011', school_id: 'sch_001', title: 'New Message from Driver', body: 'Ali Mohammed: Bus B-001 has tyre warning. Completing trip and reporting to maintenance.', type: 'message', is_read: false, created_at: '2026-06-23T07:12:00Z' },
  { id: 'notif_012', school_id: 'sch_002', title: 'Student Absent', body: 'Amira Hassan Mohammed marked absent on Abu Dhabi North Route.', type: 'attendance', is_read: true, created_at: '2026-06-24T07:35:00Z' },
  { id: 'notif_013', title: 'Payment Received', body: 'Sunrise Academy paid Standard annual plan $950 via online transfer.', type: 'success', is_read: true, created_at: '2026-06-22T14:00:00Z' },
  { id: 'notif_014', school_id: 'sch_001', title: 'Guest Driver Request', body: 'Tariq Bilal has requested a guest driver trip for Bus B-002 tomorrow.', type: 'info', is_read: false, created_at: '2026-06-23T06:50:00Z' },
  { id: 'notif_015', school_id: 'sch_005', title: 'Account Suspended', body: 'Future Leaders School account suspended due to overdue payment.', type: 'error', is_read: true, created_at: '2026-06-18T09:00:00Z' },
  { id: 'notif_016', school_id: 'sch_001', title: 'Bus Transfer Complete', body: 'Bus transfer (B-003 → B-004) completed. All affected students are onboard B-004.', type: 'success', is_read: true, created_at: '2026-06-22T09:45:00Z' },
  { id: 'notif_017', school_id: 'sch_003', title: 'New Route Added', body: 'Sharjah Central Route is now active. 24 students assigned.', type: 'info', is_read: true, created_at: '2025-01-10T10:00:00Z' },
  { id: 'notif_018', school_id: 'sch_001', title: 'Attendance Alert', body: 'Route B – 4 students not yet scanned at Safa Park stop.', type: 'warning', is_read: false, created_at: '2026-06-23T07:22:00Z' },
  { id: 'notif_019', title: 'System Maintenance', body: 'Scheduled maintenance on June 25 from 2:00–4:00 AM. Brief downtime expected.', type: 'system', is_read: false, created_at: '2026-06-23T08:00:00Z' },
  { id: 'notif_020', school_id: 'sch_001', title: 'Licence Expiring Soon', body: 'Driver Salim Ahmed Rashid licence expires in 6 months. Schedule renewal.', type: 'warning', is_read: false, created_at: '2026-06-23T09:00:00Z' },
  { id: 'notif_021', school_id: 'sch_002', title: 'Leave Request Pending', body: 'Khalid Ibrahim Al-Amin leave for June 28–30 awaits approval.', type: 'leave', is_read: false, created_at: '2026-06-23T12:05:00Z' },
  { id: 'notif_022', school_id: 'sch_006', title: 'New Student Enrolled', body: 'Aisha Omar Abdullah enrolled and assigned to Route E.', type: 'info', is_read: true, created_at: '2024-08-12T11:00:00Z' },
  { id: 'notif_023', title: 'Monthly Report Ready', body: 'June 2026 attendance & revenue report is available in the Reports section.', type: 'system', is_read: false, created_at: '2026-06-23T08:00:00Z' },
  { id: 'notif_024', school_id: 'sch_001', title: 'Support Ticket Updated', body: 'Ticket #TKT-002 status changed to In Progress by Support Team.', type: 'info', is_read: true, created_at: '2026-06-22T11:05:00Z' },
  { id: 'notif_025', school_id: 'sch_004', title: 'Subscription Expiring', body: 'Bright Minds Institute Basic subscription expired June 19. Please renew.', type: 'error', is_read: false, created_at: '2026-06-23T08:00:00Z' },
  { id: 'notif_026', school_id: 'sch_001', title: 'Parent Enquiry', body: 'Solomon Getachew asked about Yonas boarding confirmation on Bus B-001.', type: 'message', is_read: true, created_at: '2026-06-23T07:09:00Z' },
  { id: 'notif_027', school_id: 'sch_001', title: 'Trip In Progress', body: 'Route D pickup underway. Kebede Alemu Tadesse driving Bus B-005. 30 students onboard.', type: 'info', is_read: true, created_at: '2026-06-23T07:06:00Z' },
  { id: 'notif_028', school_id: 'sch_003', title: 'Driver Attendance Low', body: 'Abdirahman Warsame Ali has not completed QR scan for 3 students this week.', type: 'warning', is_read: false, created_at: '2026-06-22T17:00:00Z' },
  { id: 'notif_029', title: 'Subscription Renewed', body: 'Star International Academy Premium subscription renewed for 2026–27.', type: 'success', is_read: true, created_at: '2026-06-15T10:00:00Z' },
  { id: 'notif_030', school_id: 'sch_008', title: 'New Admin App Update', body: 'SmartTrack Admin v3.2 is available. Update to access the new bulk messaging module.', type: 'system', is_read: false, created_at: '2026-06-23T10:00:00Z' },
]

// Extended support tickets to reach 12 total (existing 3 + 9 more)
export const mockExtraTickets: SupportTicket[] = [
  { id: 'TKT-004', school_id: 'sch_002', school_name: 'Sunrise Academy', reporter_id: 'sa_002', reporter_name: 'Fatima Al-Zahra', reporter_role: 'school_admin', type: 'Technical Issue', priority: 'high', status: 'open', description: 'Live map is not updating in real-time. Bus locations are frozen and not refreshing.', created_at: '2026-06-23T08:30:00Z', replies: [] },
  { id: 'TKT-005', school_id: 'sch_003', school_name: 'Green Valley School', reporter_id: 'drv_008', reporter_name: 'Abdirahman Warsame Ali', reporter_role: 'driver', type: 'App Issue', priority: 'medium', status: 'in_progress', description: 'Driver app crashes on QR scan when I have more than 20 students on list.', assigned_to: 'Support Team', created_at: '2026-06-22T09:00:00Z', replies: [{ id: 'rpl_005', ticket_id: 'TKT-005', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Reproduced the bug on Android 12. Fix will be in v3.3 rolling out this week.', created_at: '2026-06-22T14:00:00Z' }] },
  { id: 'TKT-006', school_id: 'sch_001', school_name: 'Al-Noor International School', reporter_id: 'sa_001', reporter_name: 'Hassan Al-Rashid', reporter_role: 'school_admin', type: 'Feature Request', priority: 'low', status: 'open', description: 'Request to allow bulk WhatsApp messaging filtered by class (e.g. only Class 7 parents).', created_at: '2026-06-21T11:00:00Z', replies: [{ id: 'rpl_006', ticket_id: 'TKT-006', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Great suggestion. Added to Q3 roadmap. Thank you.', created_at: '2026-06-21T16:00:00Z' }] },
  { id: 'TKT-007', school_id: 'sch_004', school_name: 'Bright Minds Institute', reporter_id: 'sa_004', reporter_name: 'Aisha Rahman', reporter_role: 'school_admin', type: 'Billing Query', priority: 'high', status: 'open', description: 'Our subscription shows expired but we paid by bank transfer 3 days ago. Please reactivate urgently.', created_at: '2026-06-23T09:30:00Z', replies: [] },
  { id: 'TKT-008', school_id: 'sch_006', school_name: 'Star International Academy', reporter_id: 'sa_006', reporter_name: 'Noor Hussain', reporter_role: 'school_admin', type: 'Route Issue', priority: 'medium', status: 'resolved', description: 'Route E was missing the RAK Free Zone stop. Students at that stop were not showing in attendance.', assigned_to: 'Support Team', created_at: '2026-06-18T10:00:00Z', replies: [{ id: 'rpl_008', ticket_id: 'TKT-008', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Stop has been added. Please assign the students from your admin panel.', created_at: '2026-06-18T14:00:00Z' }] },
  { id: 'TKT-009', school_id: 'sch_001', school_name: 'Al-Noor International School', reporter_id: 'drv_002', reporter_name: 'Salim Ahmed Rashid', reporter_role: 'driver', type: 'Technical Issue', priority: 'critical', status: 'escalated', description: 'GPS showing my bus in wrong location – showing Dubai Marina but I am in Jumeirah. Parents getting wrong alerts.', assigned_to: 'Engineering Team', created_at: '2026-06-23T07:15:00Z', replies: [{ id: 'rpl_009', ticket_id: 'TKT-009', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Escalated to engineering. Known edge case with GPS drift. Hotfix being deployed in 30 minutes.', created_at: '2026-06-23T07:30:00Z' }] },
  { id: 'TKT-010', school_id: 'sch_002', school_name: 'Sunrise Academy', reporter_id: 'par_std_011', reporter_name: 'Hassan Mohammed Al-Zaidi', reporter_role: 'parent', type: 'App Issue', priority: 'medium', status: 'open', description: 'Parent app shows bus as "En Route" even after child arrived at school. Arrival notification never came.', created_at: '2026-06-23T08:45:00Z', replies: [] },
  { id: 'TKT-011', school_id: 'sch_003', school_name: 'Green Valley School', reporter_id: 'sa_003', reporter_name: 'Mohammed Khalid', reporter_role: 'school_admin', type: 'Technical Issue', priority: 'medium', status: 'in_progress', description: 'CSV export for attendance not working. Download spinner keeps running but file never downloads.', assigned_to: 'Support Team', created_at: '2026-06-23T10:30:00Z', replies: [{ id: 'rpl_011', ticket_id: 'TKT-011', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Fix deployed for CSV export. Please try again and confirm.', created_at: '2026-06-23T12:30:00Z' }] },
  { id: 'TKT-012', school_id: 'sch_008', school_name: 'Pioneer Institute', reporter_id: 'drv_010x', reporter_name: 'Girma Tadesse Bekele', reporter_role: 'driver', type: 'Driver Issue', priority: 'high', status: 'in_progress', description: 'Drop attendance not saving. Students are showing absent at drop even when I scan their QR codes successfully.', assigned_to: 'Engineering Team', created_at: '2026-06-22T17:30:00Z', replies: [{ id: 'rpl_012', ticket_id: 'TKT-012', user_id: 'admin_001', user_name: 'Support Agent', user_role: 'super_admin', content: 'Server-side syncing issue confirmed. A fix is being pushed tonight. Thank you for reporting.', created_at: '2026-06-22T18:45:00Z' }] },
]

// Extended training modules to reach 8 total (existing 6 + 2 more)
export const mockExtraTrainingModules: TrainingModule[] = [
  { id: 'trn_007', title: 'Emergency Alerts & Safe Protocols', description: 'How to issue emergency alerts from the admin panel and follow the escalation checklist during incidents.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'school_admin', is_published: true, created_at: '2026-03-01T08:00:00Z', view_count: 82, duration_mins: 14 },
  { id: 'trn_008', title: 'Understanding Attendance Analytics', description: 'Deep dive into attendance dashboard: trend charts, export reports, and identify patterns.', video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', target_role: 'school_admin', is_published: false, created_at: '2026-04-15T08:00:00Z', view_count: 12, duration_mins: 20 },
]

// Extended subscriptions to reach 8 total (existing 5 + 3 more)
export const mockExtraSubscriptions: Subscription[] = [
  { id: 'sub_006', school_id: 'sch_006', school_name: 'Star International Academy', plan_id: 'plan_premium', plan_name: 'Premium', start_date: '2025-08-12', end_date: '2026-08-11', amount_paid: 1910, payment_method: 'Bank Transfer', status: 'active' },
  { id: 'sub_007', school_id: 'sch_007', school_name: 'Excellence School', plan_id: 'plan_standard', plan_name: 'Standard', start_date: '2026-06-20', end_date: '2026-07-19', amount_paid: 99, payment_method: 'Online', status: 'trial' },
  { id: 'sub_008', school_id: 'sch_008', school_name: 'Pioneer Institute', plan_id: 'plan_premium', plan_name: 'Premium', start_date: '2024-07-01', end_date: '2025-06-30', amount_paid: 1910, payment_method: 'Bank Transfer', status: 'active' },
]

// Extended bus transfers to reach 3 total (existing 2 + 1 more)
export const mockExtraBusTransfers: BusTransfer[] = [
  { id: 'bt_003', school_id: 'sch_006', original_trip_id: 'trp_eth_001', original_bus_id: 'bus_009', original_bus_number: 'B-009', new_bus_id: 'bus_010', new_bus_number: 'B-010', new_driver_id: 'drv_010', new_driver_name: 'Girma Tadesse Bekele', authorised_by: 'Noor Hussain', transfer_at: '2026-06-20T08:00:00Z', status: 'completed', reason: 'Bus B-009 had sudden engine failure on RAK Free Zone road. Substituted with B-010.', affected_students: 35 },
]

// Extended guest trips to reach 4 total (existing 2 + 2 more)
export const mockExtraGuestTrips: GuestTrip[] = [
  { id: 'gt_003', school_id: 'sch_003', guest_driver_name: 'Abdirahman Warsame Hassan', guest_driver_phone: '+971551234700', bus_registration: 'SHJ-X-55001', status: 'completed', approved_by: 'Mohammed Khalid', started_at: '2026-06-18T07:00:00Z', ended_at: '2026-06-18T07:50:00Z', students: [{ id: 'std_013', name: 'Biruk Alemu Demissie', class: '3', division: 'A' }, { id: 'std_014', name: 'Meron Girma Tadesse', class: '8', division: 'C' }], created_at: '2026-06-17T20:00:00Z' },
  { id: 'gt_004', school_id: 'sch_006', guest_driver_name: 'Yusuf Hassan Noor', guest_driver_phone: '+971551234701', bus_registration: 'RAK-Z-99001', status: 'rejected', approved_by: 'Noor Hussain', students: [{ id: 'std_017', name: 'Nardos Hailu Bekele', class: '9', division: 'B' }, { id: 'std_018', name: 'Aisha Omar Abdullah', class: '6', division: 'A' }], created_at: '2026-06-21T18:30:00Z' },
]

// ─── Convenience aggregated exports ───────────────────────────────────────────

export const allDrivers: Driver[] = [...mockDrivers, ...mockExtraDrivers]
export const allBuses: Bus[] = [...mockBuses, ...mockExtraBuses]
export const allRoutes: Route[] = [...mockRoutes, ...mockExtraRoutes]
export const allTrips: Trip[] = [...mockTrips, ...mockExtraTrips]
export const allStudents: Student[] = [...mockStudents, ...mockExtraStudents]
export const allAttendance: AttendanceRecord[] = [...mockAttendance, ...mockExtraAttendance]
export const allLeaves: Leave[] = [...mockLeaves, ...mockExtraLeaves]
export const allLostFound: LostFoundItem[] = [...mockLostFound, ...mockExtraLostFound]
export const allMessages: Message[] = [...mockMessages, ...mockExtraMessages]
export const allNotifications: AppNotification[] = [...mockNotifications, ...mockExtraNotifications]
export const allSupportTickets: SupportTicket[] = [...mockTickets, ...mockExtraTickets]
export const allTrainingModules: TrainingModule[] = [...mockTrainingModules, ...mockExtraTrainingModules]
export const allSubscriptions: Subscription[] = [...mockSubscriptions, ...mockExtraSubscriptions]
export const allBusTransfers: BusTransfer[] = [...mockBusTransfers, ...mockExtraBusTransfers]
export const allGuestTrips: GuestTrip[] = [...mockGuestTrips, ...mockExtraGuestTrips]
