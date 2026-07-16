const { z } = require('zod');

const createTicket = z.object({
  type: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  description: z.string().min(1),
});

const updateTicket = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to: z.string().optional(),
  description: z.string().min(1).optional(),
});

const addReply = z.object({
  content: z.string().min(1),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  school_id: z.string().optional(),
});

module.exports = { createTicket, updateTicket, addReply, idParam, listQuery };
