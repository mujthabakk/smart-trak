-- SmartTrack initial schema
-- Tables are normalized: display-friendly fields (school_name, driver_name, bus_number, etc.)
-- are NOT duplicated as columns — the service layer JOINs to produce them in API responses
-- so the shape matches src/types/index.ts exactly.

-- ---------------------------------------------------------------------------
-- Human-readable ID generation (SCH-0001, STD-0001, ...), matching the ids
-- already used across the frontend mock data / demo accounts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  prefix TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_code(p_prefix TEXT, p_width INT DEFAULT 4)
RETURNS TEXT AS $$
DECLARE
  v BIGINT;
BEGIN
  INSERT INTO counters(prefix, value) VALUES (p_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET value = counters.value + 1
  RETURNING value INTO v;
  RETURN p_prefix || '-' || LPAD(v::text, p_width, '0');
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_annual NUMERIC(10,2) NOT NULL,
  price_per_student NUMERIC(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  max_students INT NOT NULL,
  max_buses INT NOT NULL,
  max_drivers INT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Schools (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE schools (
  id TEXT PRIMARY KEY DEFAULT next_code('SCH'),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  post_code TEXT,
  country TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  website TEXT,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','suspended','pending')),
  subdomain TEXT NOT NULL UNIQUE,
  admin_name TEXT,
  admin_email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schools_plan_id ON schools(plan_id);

-- ---------------------------------------------------------------------------
-- Users (auth identities for all 5 roles)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT next_code('USR'),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin','school_admin','driver','guest_driver','parent')),
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  avatar TEXT,
  fcm_token TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE password_resets (
  id TEXT PRIMARY KEY DEFAULT next_code('OTP'),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);

-- ---------------------------------------------------------------------------
-- Subscriptions (billing records per school)
-- ---------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY DEFAULT next_code('SUB'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash','Bank Transfer','Online','Cheque','Card')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','suspended','trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_school_id ON subscriptions(school_id);

-- ---------------------------------------------------------------------------
-- Buses (current_trip_id / driver_id FKs added later — circular refs)
-- ---------------------------------------------------------------------------
CREATE TABLE buses (
  id TEXT PRIMARY KEY DEFAULT next_code('BUS'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  bus_number TEXT NOT NULL,
  seat_capacity INT NOT NULL,
  make_model TEXT,
  year INT,
  insurance_expiry DATE,
  fitness_cert_expiry DATE,
  safety_qr_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_trip_id TEXT,
  driver_id TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('running','idle','offline')),
  current_stop TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, bus_number)
);
CREATE INDEX idx_buses_school_id ON buses(school_id);

-- ---------------------------------------------------------------------------
-- Drivers
-- ---------------------------------------------------------------------------
CREATE TABLE drivers (
  id TEXT PRIMARY KEY DEFAULT next_code('DRV'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  license_number TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  photo_url TEXT,
  address TEXT,
  assigned_bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, employee_id)
);
CREATE INDEX idx_drivers_school_id ON drivers(school_id);
CREATE INDEX idx_drivers_assigned_bus_id ON drivers(assigned_bus_id);

ALTER TABLE buses ADD CONSTRAINT fk_buses_driver
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
CREATE INDEX idx_buses_driver_id ON buses(driver_id);

-- ---------------------------------------------------------------------------
-- Routes + Stops
-- ---------------------------------------------------------------------------
CREATE TABLE routes (
  id TEXT PRIMARY KEY DEFAULT next_code('RT'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pickup','drop')),
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  route_qr_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_routes_school_id ON routes(school_id);
CREATE INDEX idx_routes_bus_id ON routes(bus_id);

CREATE TABLE stops (
  id TEXT PRIMARY KEY DEFAULT next_code('STP'),
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  estimated_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stops_route_id ON stops(route_id);

-- ---------------------------------------------------------------------------
-- Students + Parents
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  id TEXT PRIMARY KEY DEFAULT next_code('STD'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  division TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT,
  photo_url TEXT,
  student_qr_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pickup_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  drop_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_pickup_stop_id ON students(pickup_stop_id);
CREATE INDEX idx_students_drop_stop_id ON students(drop_stop_id);

CREATE TABLE parent_details (
  id TEXT PRIMARY KEY DEFAULT next_code('PAR'),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parent_details_student_id ON parent_details(student_id);

-- ---------------------------------------------------------------------------
-- Trips (a single run of a route on a given day) + late FK back onto buses
-- ---------------------------------------------------------------------------
CREATE TABLE trips (
  id TEXT PRIMARY KEY DEFAULT next_code('TRP'),
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  bus_id TEXT NOT NULL REFERENCES buses(id),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('pickup','drop')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_trips_bus_id ON trips(bus_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);

ALTER TABLE buses ADD CONSTRAINT fk_buses_current_trip
  FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY DEFAULT next_code('ATT'),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','leave')),
  pickup_time TIMESTAMPTZ,
  drop_time TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id)
);
CREATE INDEX idx_attendance_trip_id ON attendance_records(trip_id);
CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- ---------------------------------------------------------------------------
-- Leave requests
-- ---------------------------------------------------------------------------
CREATE TABLE leaves (
  id TEXT PRIMARY KEY DEFAULT next_code('LV'),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leaves_student_id ON leaves(student_id);
CREATE INDEX idx_leaves_school_id ON leaves(school_id);

-- ---------------------------------------------------------------------------
-- Lost & Found
-- ---------------------------------------------------------------------------
CREATE TABLE lost_found_items (
  id TEXT PRIMARY KEY DEFAULT next_code('LF'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  bus_id TEXT NOT NULL REFERENCES buses(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  description TEXT NOT NULL,
  photo_url TEXT,
  image_url TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','claimed','resolved'))
);
CREATE INDEX idx_lost_found_school_id ON lost_found_items(school_id);

CREATE TABLE lf_claims (
  id TEXT PRIMARY KEY DEFAULT next_code('LFC'),
  lost_found_id TEXT NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  claim_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  claimed_at TIMESTAMPTZ
);
CREATE INDEX idx_lf_claims_lost_found_id ON lf_claims(lost_found_id);

-- ---------------------------------------------------------------------------
-- Messages (bulk messaging)
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT next_code('MSG'),
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all_parents','route_parents','individual','all_drivers','driver','admin')),
  recipient_id TEXT,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_school_id ON messages(school_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT next_code('NTF'),
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info','warning','success','error','emergency','leave','attendance','message','system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_school_id ON notifications(school_id);

-- ---------------------------------------------------------------------------
-- Support Tickets
-- ---------------------------------------------------------------------------
CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY DEFAULT next_code('TKT'),
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','escalated')),
  description TEXT NOT NULL,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_tickets_school_id ON support_tickets(school_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

CREATE TABLE ticket_replies (
  id TEXT PRIMARY KEY DEFAULT next_code('RPL'),
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);

-- ---------------------------------------------------------------------------
-- Training Modules
-- ---------------------------------------------------------------------------
CREATE TABLE training_modules (
  id TEXT PRIMARY KEY DEFAULT next_code('TRN'),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  target_role TEXT NOT NULL CHECK (target_role IN ('super_admin','school_admin','driver','guest_driver','parent')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  duration_mins INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bus Transfers (mid-trip bus swap / breakdown handling)
-- ---------------------------------------------------------------------------
CREATE TABLE bus_transfers (
  id TEXT PRIMARY KEY DEFAULT next_code('BT'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  original_trip_id TEXT NOT NULL REFERENCES trips(id),
  original_bus_id TEXT NOT NULL REFERENCES buses(id),
  new_bus_id TEXT NOT NULL REFERENCES buses(id),
  new_driver_id TEXT REFERENCES drivers(id),
  authorised_by TEXT NOT NULL REFERENCES users(id),
  transfer_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','in_progress','completed')),
  reason TEXT NOT NULL,
  affected_students INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_bus_transfers_school_id ON bus_transfers(school_id);

-- ---------------------------------------------------------------------------
-- Guest Trips (temporary relief driver flow)
-- ---------------------------------------------------------------------------
CREATE TABLE guest_trips (
  id TEXT PRIMARY KEY DEFAULT next_code('GT'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  guest_driver_name TEXT NOT NULL,
  guest_driver_phone TEXT NOT NULL,
  bus_registration TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','approved','rejected','completed')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guest_trips_school_id ON guest_trips(school_id);

CREATE TABLE guest_trip_students (
  id TEXT PRIMARY KEY DEFAULT next_code('GTS'),
  guest_trip_id TEXT NOT NULL REFERENCES guest_trips(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id)
);
CREATE INDEX idx_guest_trip_students_guest_trip_id ON guest_trip_students(guest_trip_id);

-- ---------------------------------------------------------------------------
-- Audit Logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT next_code('AUD'),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- Bus Locations (append-only GPS pings — powers Live Map + Socket.IO)
-- ---------------------------------------------------------------------------
CREATE TABLE bus_locations (
  id BIGSERIAL PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed NUMERIC(6,2) NOT NULL DEFAULT 0,
  current_stop TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_started','in_progress','completed')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bus_locations_bus_id_recorded_at ON bus_locations(bus_id, recorded_at DESC);
CREATE INDEX idx_bus_locations_trip_id ON bus_locations(trip_id);
