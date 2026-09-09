-- ---------------------------------------------------------------------------
-- Classes + Divisions — per-school configurable, replacing the old hardcoded
-- CLASSES/DIVISIONS frontend constants (every division A-E offered under
-- every class, for every school, with no way to customize). Seeded below
-- with those same values so existing students' class/division stay
-- selectable with zero behavior change until a school_admin customizes them.
-- ---------------------------------------------------------------------------
CREATE TABLE classes (
  id TEXT PRIMARY KEY DEFAULT next_code('CLS'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
CREATE INDEX idx_classes_school_id ON classes(school_id);

CREATE TABLE divisions (
  id TEXT PRIMARY KEY DEFAULT next_code('DIV'),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, name)
);
CREATE INDEX idx_divisions_class_id ON divisions(class_id);

DO $$
DECLARE
  sch RECORD;
  new_class_id TEXT;
  cls_name TEXT;
  div_name TEXT;
  idx INT;
BEGIN
  FOR sch IN SELECT id FROM schools LOOP
    idx := 0;
    FOREACH cls_name IN ARRAY ARRAY['KG 1','KG 2','1','2','3','4','5','6','7','8','9','10','11','12'] LOOP
      INSERT INTO classes (school_id, name, order_index) VALUES (sch.id, cls_name, idx)
      RETURNING id INTO new_class_id;
      FOREACH div_name IN ARRAY ARRAY['A','B','C','D','E'] LOOP
        INSERT INTO divisions (class_id, school_id, name) VALUES (new_class_id, sch.id, div_name);
      END LOOP;
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;
