const { z } = require('zod');

const createTransfer = z.object({
  school_id: z.string().optional(),
  original_trip_id: z.string().min(1),
  original_bus_id: z.string().min(1),
  new_bus_id: z.string().min(1),
  new_driver_id: z.string().optional(),
  reason: z.string().min(1),
  affected_students: z.number().int().nonnegative().optional(),
});

const updateTransfer = z.object({
  status: z.enum(['initiated', 'in_progress', 'completed']).optional(),
  reason: z.string().min(1).optional(),
  affected_students: z.number().int().nonnegative().optional(),
  new_driver_id: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['initiated', 'in_progress', 'completed']).optional(),
});

module.exports = { createTransfer, updateTransfer, idParam, listQuery };
