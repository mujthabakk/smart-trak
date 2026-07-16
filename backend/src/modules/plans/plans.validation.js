const { z } = require('zod');

const planBody = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  label: z.string().min(1),
  price_monthly: z.number().nonnegative(),
  price_annual: z.number().nonnegative(),
  price_per_student: z.number().nonnegative(),
  billing_cycle: z.enum(['monthly', 'annual']),
  max_students: z.number().int().nonnegative(),
  max_buses: z.number().int().nonnegative(),
  max_drivers: z.number().int().nonnegative(),
  features: z.array(z.string()).default([]),
  is_popular: z.boolean().optional(),
});

const updatePlanBody = planBody.partial();

const idParam = z.object({ id: z.string().min(1) });

module.exports = { planBody, updatePlanBody, idParam };
