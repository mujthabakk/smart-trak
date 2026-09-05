const { z } = require('zod');

const createTrip = z.object({
  school_id: z.string().optional(),
  // Required for an admin requesting on behalf of an outside guest; a
  // guest_driver caller omits both — the controller derives them from the
  // caller's own account instead (see guestTrips.controller.js's create()).
  guest_driver_name: z.string().min(1).optional(),
  guest_driver_phone: z.string().min(1).optional(),
  bus_registration: z.string().min(1),
  student_ids: z.array(z.string().min(1)).optional(),
});

const updateTrip = z.object({
  guest_driver_name: z.string().min(1).optional(),
  guest_driver_phone: z.string().min(1).optional(),
  bus_registration: z.string().min(1).optional(),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'completed']).optional(),
});

const markAttendance = z.object({
  records: z.array(z.object({
    student_id: z.string().min(1),
    status: z.enum(['present', 'absent']),
  })).min(1),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'completed']).optional(),
});

module.exports = { createTrip, updateTrip, markAttendance, idParam, listQuery };
