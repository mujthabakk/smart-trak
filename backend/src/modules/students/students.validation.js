const { z } = require('zod');

// AddEditStudent.tsx (frontend form) keeps local field names (fullName, className,
// guardianName) that don't match the DB/API's snake_case names (name, class,
// parent_name). Both spellings are accepted here; students.service.js resolves
// whichever was sent, and API responses always use the DB names to match
// src/types/index.ts's Student/ParentDetail interfaces.
const parentInput = z
  .object({
    id: z.string().optional(),
    parent_name: z.string().min(1).optional(),
    guardianName: z.string().min(1).optional(),
    relationship: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(1),
    whatsapp: z.string().optional(),
  })
  .refine((d) => Boolean(d.parent_name || d.guardianName), {
    message: 'parent_name is required',
    path: ['parent_name'],
  });

const studentBase = z.object({
  name: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  class: z.string().min(1).optional(),
  className: z.string().min(1).optional(),
  division: z.string().min(1),
  roll_number: z.string().min(1),
  dob: z.string().min(1),
  gender: z.string().optional(),
  photo_url: z.string().optional(),
  is_active: z.boolean().optional(),
  pickup_stop_id: z.string().optional(),
  drop_stop_id: z.string().optional(),
  address: z.string().optional(),
  parents: z.array(parentInput).optional(),
});

const createStudent = studentBase
  .extend({ school_id: z.string().min(1).optional() })
  .refine((d) => Boolean(d.name || d.fullName), { message: 'name is required', path: ['name'] })
  .refine((d) => Boolean(d.class || d.className), { message: 'class is required', path: ['class'] });

const updateStudent = studentBase.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  class: z.string().optional(),
  division: z.string().optional(),
  is_active: z.string().optional(),
});

module.exports = { createStudent, updateStudent, idParam, listQuery };
