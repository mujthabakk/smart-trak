const { z } = require('zod');

const RECIPIENT_TYPES = ['all_parents', 'route_parents', 'individual', 'all_drivers', 'driver', 'admin'];

const createMessage = z
  .object({
    school_id: z.string().min(1).optional(),
    recipient_type: z.enum(RECIPIENT_TYPES),
    recipient_id: z.string().optional(),
    content: z.string().min(1),
    is_scheduled: z.boolean().optional(),
    scheduled_at: z.string().optional(),
  })
  .refine(
    (data) => !['individual', 'driver'].includes(data.recipient_type) || !!data.recipient_id,
    { message: 'recipient_id is required when recipient_type is individual or driver', path: ['recipient_id'] }
  );

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  sender_id: z.string().optional(),
  recipient_type: z.enum(RECIPIENT_TYPES).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createMessage, idParam, listQuery, RECIPIENT_TYPES };
