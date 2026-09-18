-- Move plans to a flat, no-base-fee, per-student-per-year pricing model:
-- price_monthly/price_annual now hold the per-student rate (not a flat base
-- fee charged on top of it), the separate price_per_student add-on column is
-- dropped since it's now redundant with price_annual, and every feature's
-- price is zeroed out — features are bundled at no extra cost and are just
-- togglable per plan from here on.
UPDATE plans SET price_monthly = 0.23, price_annual = 2.72 WHERE id = 'plan_basic';
UPDATE plans SET price_monthly = 0.27, price_annual = 3.27 WHERE id = 'plan_standard';
UPDATE plans SET price_monthly = 0.34, price_annual = 4.08 WHERE id = 'plan_premium';

ALTER TABLE plans DROP COLUMN IF EXISTS price_per_student;

UPDATE plans SET features = (
  SELECT COALESCE(jsonb_agg(jsonb_set(f, '{price}', '0')), '[]'::jsonb)
  FROM jsonb_array_elements(features) f
);
