const { z } = require('zod');

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Online', 'Cheque', 'Card'];
const STATUSES = ['active', 'expired', 'suspended', 'trial'];

const createSubscription = z.object({
  school_id: z.string().min(1),
  plan_id: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  amount_paid: z.number().nonnegative(),
  payment_method: z.enum(PAYMENT_METHODS),
  status: z.enum(STATUSES).optional(),
});

const updateSubscription = createSubscription.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createSubscription, updateSubscription, idParam, listQuery, PAYMENT_METHODS, STATUSES };
