const { z } = require('zod');

const createSchool = z.object({
  school_code: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Must be alphanumeric with dashes or underscores'),
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
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  supervisor_name: z.string().optional(),
  supervisor_phone: z.string().optional(),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf('timeZone').includes(tz), 'Unknown timezone').optional(),
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
