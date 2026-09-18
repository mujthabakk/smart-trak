-- Bring the feature catalog and each seeded plan's feature checklist in line
-- with the descriptive feature copy already hardcoded in the frontend
-- (frontend/src/lib/siteContent.ts PLANS, used by the onboarding wizard) —
-- so those same names are addable/toggleable from the super-admin Plans UI
-- instead of only ever existing as static marketing copy.
INSERT INTO plan_feature_catalog (name) VALUES
  ('Real-time GPS tracking'),
  ('QR attendance (Safety + Route + Student)'),
  ('Push notifications'),
  ('Live fleet map'),
  ('Basic attendance reports'),
  ('Email support'),
  ('Everything in Basic'),
  ('WhatsApp notifications'),
  ('Leave management'),
  ('Lost & found'),
  ('Bus transfer module'),
  ('Advanced reports & analytics'),
  ('Training centre access'),
  ('Priority email support'),
  ('Everything in Standard'),
  ('WhatsApp + SMS notifications'),
  ('Guest driver management'),
  ('Full analytics & audit logs'),
  ('Bulk school & student import'),
  ('API access'),
  ('Dedicated support & onboarding')
ON CONFLICT (name) DO NOTHING;

UPDATE plans SET features = '[
  {"name": "Real-time GPS tracking", "price": 0},
  {"name": "QR attendance (Safety + Route + Student)", "price": 0},
  {"name": "Push notifications", "price": 0},
  {"name": "Live fleet map", "price": 0},
  {"name": "Basic attendance reports", "price": 0},
  {"name": "Email support", "price": 0}
]'::jsonb WHERE id = 'plan_basic';

UPDATE plans SET features = '[
  {"name": "Everything in Basic", "price": 0},
  {"name": "WhatsApp notifications", "price": 0},
  {"name": "Leave management", "price": 0},
  {"name": "Lost & found", "price": 0},
  {"name": "Bus transfer module", "price": 0},
  {"name": "Advanced reports & analytics", "price": 0},
  {"name": "Training centre access", "price": 0},
  {"name": "Priority email support", "price": 0}
]'::jsonb WHERE id = 'plan_standard';

UPDATE plans SET features = '[
  {"name": "Everything in Standard", "price": 0},
  {"name": "WhatsApp + SMS notifications", "price": 0},
  {"name": "Guest driver management", "price": 0},
  {"name": "Full analytics & audit logs", "price": 0},
  {"name": "Bulk school & student import", "price": 0},
  {"name": "API access", "price": 0},
  {"name": "Dedicated support & onboarding", "price": 0}
]'::jsonb WHERE id = 'plan_premium';
