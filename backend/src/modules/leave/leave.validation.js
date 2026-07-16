const { z } = require('zod');

const statusEnum = z.enum(['pending', 'approved', 'rejected']);

const createLeave = z.object({
  school_id: z.string().optional(),
  student_id: z.string().min(1),
  from_date: z.string().min(1),
  to_date: z.string().min(1),
  reason: z.string().optional(),
});

const updateLeave = z.object({
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  reason: z.string().optional(),
  status: statusEnum.optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  student_id: z.string().optional(),
  status: statusEnum.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createLeave, updateLeave, idParam, listQuery };
