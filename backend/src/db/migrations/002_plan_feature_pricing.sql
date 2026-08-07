-- Plans.features used to be a plain TEXT[] of feature names, with each
-- feature's per-student price hardcoded in the frontend. Convert it to
-- JSONB so every plan can have its own editable list of {name, price}
-- feature entries, stored server-side instead of hardcoded in the UI.
--
-- Postgres doesn't allow a subquery inside ALTER COLUMN ... USING, so the
-- conversion goes through a temporary column instead.
ALTER TABLE plans ADD COLUMN features_new JSONB;

UPDATE plans p SET features_new = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', elem, 'price', 0)), '[]'::jsonb)
  FROM unnest(p.features) AS elem
);

ALTER TABLE plans ALTER COLUMN features_new SET NOT NULL;
ALTER TABLE plans ALTER COLUMN features_new SET DEFAULT '[]'::jsonb;

ALTER TABLE plans DROP COLUMN features;
ALTER TABLE plans RENAME COLUMN features_new TO features;
