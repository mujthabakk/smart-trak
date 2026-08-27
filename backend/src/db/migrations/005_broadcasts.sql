CREATE TABLE broadcasts (
  id TEXT PRIMARY KEY DEFAULT next_code('BRD'),
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info','warning','success','error','emergency','leave','attendance','message','system')),
  audience TEXT NOT NULL,
  target_route_ids TEXT[],
  target_driver_ids TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_sender_id ON broadcasts(sender_id);
