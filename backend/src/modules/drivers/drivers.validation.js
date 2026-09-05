const { z } = require('zod');

const driverInput = z.object({
  user_id: z.string().optional(),
  name: z.string().min(1),
  employee_id: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  whatsapp: z.string().optional(),
  license_number: z.string().min(1),
  license_expiry: z.string().min(1),
  photo_url: z.string().optional(),
  address: z.string().optional(),
  assigned_bus_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

const createDriver = driverInput.extend({
  school_id: z.string().min(1).optional(),
});

const updateDriver = driverInput.partial().extend({
  // allow explicit un-assignment: PATCH { assigned_bus_id: null }
  assigned_bus_id: z.string().nullable().optional(),
  // Editing a guest driver's own validity after creation (extend/shorten
  // their access) — only meaningful when the driver already has is_guest
  // true; harmless no-ops otherwise since the service only writes columns
  // that are actually present in the body.
  guest_validity_type: z.enum(['trips', 'days']).optional(),
  guest_max_trips: z.number().int().positive().optional(),
  guest_expires_at: z.string().optional(),
  guest_trips_used: z.number().int().nonnegative().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  is_active: z.string().optional(),
  is_guest: z.string().optional(),
});

const expiringQuery = z.object({
  school_id: z.string().optional(),
  days: z.string().optional(),
});

const createGuestDriver = z.object({
  school_id: z.string().min(1).optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  license_number: z.string().min(1),
  license_expiry: z.string().min(1),
  guest_validity_type: z.enum(['trips', 'days']),
  guest_validity_value: z.number().int().positive(),
});

module.exports = { createDriver, updateDriver, idParam, listQuery, expiringQuery, createGuestDriver };
