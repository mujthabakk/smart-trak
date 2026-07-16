const { z } = require('zod');

const busInput = z.object({
  bus_number: z.string().min(1),
  seat_capacity: z.number().int().positive(),
  make_model: z.string().optional(),
  year: z.number().int().optional(),
  insurance_expiry: z.string().optional(),
  fitness_cert_expiry: z.string().optional(),
  driver_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

const createBuses = z.object({
  school_id: z.string().min(1).optional(),
  buses: z.array(busInput).min(1),
});

const updateBus = busInput.partial().extend({
  status: z.enum(['running', 'idle', 'offline']).optional(),
  current_stop: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  is_active: z.string().optional(),
});

module.exports = { createBuses, updateBus, idParam, listQuery };
