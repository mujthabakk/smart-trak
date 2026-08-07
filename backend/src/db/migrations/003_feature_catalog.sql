-- Global catalog of feature names a super_admin can pick from when building
-- a plan. Plans still store their own {name, price} pairs in plans.features
-- (each plan sets its own price for a feature it enables) — this catalog is
-- just the reusable list of feature names offered in that picker, so admins
-- aren't retyping/misspelling names plan after plan.
CREATE TABLE plan_feature_catalog (
  id TEXT PRIMARY KEY DEFAULT next_code('FEA'),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plan_feature_catalog (name)
SELECT DISTINCT elem->>'name'
FROM plans, jsonb_array_elements(plans.features) AS elem
ON CONFLICT (name) DO NOTHING;
