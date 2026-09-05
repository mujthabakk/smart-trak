-- guest_trip_students had no way to record whether an assigned student was
-- actually marked present/absent on a guest-driven trip — the guest driver
-- could be approved and complete the trip, but had no attendance data to
-- report along the way, unlike the real driver/attendance flow.
ALTER TABLE guest_trip_students ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent'));
ALTER TABLE guest_trip_students ADD COLUMN marked_at TIMESTAMPTZ;
