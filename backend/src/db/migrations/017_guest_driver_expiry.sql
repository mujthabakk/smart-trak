-- Guest/temporary driver accounts: a driver row can now be marked as
-- time-boxed, expiring either after a number of days or a number of trips
-- started. Enforced in auth.service.js's verifyCredentials (login) and
-- trips.service.js's startTrip (defense in depth).
ALTER TABLE drivers ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE drivers ADD COLUMN guest_validity_type TEXT CHECK (guest_validity_type IN ('trips', 'days'));
ALTER TABLE drivers ADD COLUMN guest_expires_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN guest_max_trips INT;
ALTER TABLE drivers ADD COLUMN guest_trips_used INT NOT NULL DEFAULT 0;
