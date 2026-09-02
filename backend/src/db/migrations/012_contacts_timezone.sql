ALTER TABLE schools ADD COLUMN supervisor_name TEXT;
ALTER TABLE schools ADD COLUMN supervisor_phone TEXT;
ALTER TABLE schools ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

ALTER TABLE buses ADD COLUMN assistant_name TEXT;
ALTER TABLE buses ADD COLUMN assistant_phone TEXT;
