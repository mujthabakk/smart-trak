const { z } = require('zod');

const createTrip = z.object({
  school_id: z.string().optional(),
  guest_driver_name: z.string().min(1),
  guest_driver_phone: z.string().min(1),
  bus_registration: z.string().min(1),
  student_ids: z.array(z.string().min(1)).optional(),
});

const updateTrip = z.object({
  guest_driver_name: z.string().min(1).optional(),
  guest_driver_phone: z.string().min(1).optional(),
  bus_registration: z.string().min(1).optional(),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'completed']).optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'completed']).optional(),
});

module.exports = { createTrip, updateTrip, idParam, listQuery };
