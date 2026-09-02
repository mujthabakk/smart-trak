ALTER TABLE attendance_records ADD COLUMN offboarded_at TIMESTAMPTZ;

CREATE TABLE alert_events (
  id TEXT PRIMARY KEY DEFAULT next_code('ALT'),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('pickup','drop')),
  distance_m NUMERIC(8,1),
  message TEXT NOT NULL,
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id, alert_type)
);
CREATE INDEX idx_alert_events_student ON alert_events(student_id, fired_at DESC);
