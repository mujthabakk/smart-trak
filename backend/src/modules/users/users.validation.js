const { z } = require('zod');

const ROLES = ['super_admin', 'school_admin', 'driver', 'guest_driver', 'parent'];

const createUser = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  school_id: z.string().optional(),
  avatar: z.string().optional(),
  fcm_token: z.string().optional(),
});

const updateUser = createUser.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  role: z.enum(ROLES).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { createUser, updateUser, idParam, listQuery, ROLES };
