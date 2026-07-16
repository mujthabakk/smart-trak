const { z } = require('zod');

const reportItem = z.object({
  school_id: z.string().optional(),
  bus_id: z.string().min(1),
  driver_id: z.string().min(1),
  description: z.string().min(1),
  photo_url: z.string().optional(),
  image_url: z.string().optional(),
});

const updateItem = z.object({
  description: z.string().min(1).optional(),
  status: z.enum(['reported', 'claimed', 'resolved']).optional(),
  photo_url: z.string().optional(),
  image_url: z.string().optional(),
});

const createClaim = z.object({
  student_id: z.string().min(1),
  claim_note: z.string().optional(),
});

const updateClaim = z.object({
  status: z.enum(['pending', 'resolved']).optional(),
  claim_note: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const claimParams = z.object({ id: z.string().min(1), claimId: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  bus_id: z.string().optional(),
  status: z.enum(['reported', 'claimed', 'resolved']).optional(),
});

module.exports = { reportItem, updateItem, createClaim, updateClaim, idParam, claimParams, listQuery };
