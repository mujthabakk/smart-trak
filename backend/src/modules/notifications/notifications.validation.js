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

const broadcastNotification = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(TYPES),
  audience: z.enum(['all_parents', 'specific_route', 'drivers']),
  route_ids: z.array(z.string()).optional(),
  driver_ids: z.array(z.string()).optional(),
}).refine(data => {
  if (data.audience === 'specific_route') return data.route_ids && data.route_ids.length > 0;
  if (data.audience === 'drivers') return data.driver_ids && data.driver_ids.length > 0;
  return true;
}, { message: "Route or driver IDs required based on audience" });

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  is_read: z.string().optional(),
  type: z.enum(TYPES).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createNotification, broadcastNotification, idParam, listQuery, TYPES };
