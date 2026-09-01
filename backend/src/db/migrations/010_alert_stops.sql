-- ---------------------------------------------------------------------------
-- Alert stop preferences: where a parent wants to be notified as the bus
-- approaches, independent of the student's actual pickup_stop_id/drop_stop_id
-- (which stay the authoritative "this is where the bus actually stops").
-- ---------------------------------------------------------------------------
ALTER TABLE students ADD COLUMN alert_pickup_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN alert_drop_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL;
