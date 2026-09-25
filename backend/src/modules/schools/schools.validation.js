const { z } = require('zod');
const { isValidTimezone } = require('../../utils/timezone');

const createSchool = z.object({
  // Uppercased here regardless of what the caller sent — this is the school's
  // login identifier (school_id), and Login.tsx always uppercases what a
  // school_admin types, so a mixed-case code stored as-is would be
  // permanently unable to log in.
  school_code: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Must be alphanumeric with dashes or underscores').transform((v) => v.toUpperCase()),
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
  timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
});

const updateSchool = createSchool.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

// Public self-service "Onboard your school" form — deliberately a smaller
// surface than createSchool: no subdomain (still derived server-side, see
// schools.service.js's apply()), and nothing an anonymous caller shouldn't
// be able to set directly (status, logo_url, etc.) — but otherwise mirrors
// the super_admin Add School form's own fields (country, post code,
// timezone, map location, and now school_code too — the applicant picks
// their own login code instead of getting a random one assigned). plan_id
// comes straight from GET /plans/public, so it always matches whatever the
// admin currently has configured — no fixed set of plan names to fall out
// of sync with.
const applySchool = z.object({
  school_code: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Must be alphanumeric with dashes or underscores').transform((v) => v.toUpperCase()),
  school_name: z.string().min(1).max(120),
  admin_name: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().min(1).max(30),
  website: z.string().max(200).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  post_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().refine(isValidTimezone, 'Unknown timezone').optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  students: z.coerce.number().int().positive().optional(),
  buses: z.coerce.number().int().positive().optional(),
  plan_id: z.string().min(1),
});

const checkCodeQuery = z.object({
  code: z.string().min(1).max(20),
});

module.exports = { createSchool, updateSchool, idParam, listQuery, applySchool, checkCodeQuery };
