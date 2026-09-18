-- Uploaded images (avatars, student/driver photos, school logos, lost & found
-- photos, etc.) stored as BLOBs in Postgres instead of on local disk. Master-
-- only table (like plans/plan_feature_catalog) — the upload module always
-- reads/writes it via masterPool explicitly, never the ambient tenant-routed
-- query(), so a single shared media store works the same regardless of which
-- school's user uploaded or is viewing the file. This mirrors the migration
-- this table replaces the need for: local disk storage under public/uploads,
-- which doesn't survive redeploys/multiple instances and isn't reachable at
-- all through a reverse proxy that only forwards /api/*.
CREATE TABLE uploaded_files (
  id TEXT PRIMARY KEY DEFAULT next_code('IMG'),
  filename TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
