const { z } = require('zod');

const ROLES = ['super_admin', 'school_admin', 'driver', 'guest_driver', 'parent'];

const createModule = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  video_url: z.string().min(1),
  thumbnail_url: z.string().optional(),
  target_role: z.enum(ROLES),
  is_published: z.boolean().optional(),
  duration_mins: z.number().int().positive().optional(),
});

const updateModule = createModule.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  target_role: z.enum(ROLES).optional(),
  is_published: z.string().optional(),
});

module.exports = { createModule, updateModule, idParam, listQuery };
