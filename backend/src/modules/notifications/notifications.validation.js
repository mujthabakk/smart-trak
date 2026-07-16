const { z } = require('zod');

const TYPES = ['info', 'warning', 'success', 'error', 'emergency', 'leave', 'attendance', 'message', 'system'];

const createNotification = z.object({
  school_id: z.string().min(1).optional(),
  user_id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(TYPES),
  action_url: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  is_read: z.string().optional(),
  type: z.enum(TYPES).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createNotification, idParam, listQuery, TYPES };
