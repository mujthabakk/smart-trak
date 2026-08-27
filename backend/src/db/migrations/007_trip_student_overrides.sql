CREATE TABLE trip_student_overrides (
  id TEXT PRIMARY KEY DEFAULT next_code('TSO'),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  override_pickup_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  override_drop_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, student_id)
);

CREATE INDEX idx_trip_student_overrides_trip_id ON trip_student_overrides(trip_id);
CREATE INDEX idx_trip_student_overrides_student_id ON trip_student_overrides(student_id);
