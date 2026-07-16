const { z } = require('zod');

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  school_id: z.string().optional(),
  entity_type: z.string().optional(),
  user_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

module.exports = { idParam, listQuery };
