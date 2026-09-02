const { z } = require('zod');

const listQuery = z.object({
  hours: z.coerce.number().int().positive().max(24 * 7).optional(),
  student_id: z.string().optional(),
  school_id: z.string().optional(),
});

module.exports = { listQuery };
