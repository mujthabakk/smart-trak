const { z } = require('zod');

const createSchool = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  post_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email(),
  website: z.string().optional(),
  plan_id: z.string().min(1),
  subdomain: z.string().min(1),
  admin_name: z.string().optional(),
  admin_email: z.string().email().optional(),
  logo_url: z.string().optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

const updateSchool = createSchool.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

module.exports = { createSchool, updateSchool, idParam, listQuery };
