const { z } = require('zod');

const stopInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  order_index: z.number().int().optional(),
  estimated_time: z.string().optional(),
});

const routeInput = z.object({
  school_id: z.string().min(1).optional(),
  bus_id: z.string().min(1).optional(),
  driver_id: z.string().min(1).optional(),
  name: z.string().min(1),
  type: z.enum(['pickup', 'drop']),
  start_point: z.string().min(1),
  end_point: z.string().min(1),
  is_active: z.boolean().optional(),
  stops: z.array(stopInput).optional(),
});

const createRoute = routeInput;

const updateRoute = routeInput.partial();

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  type: z.enum(['pickup', 'drop']).optional(),
  bus_id: z.string().optional(),
  is_active: z.string().optional(),
});

module.exports = { createRoute, updateRoute, idParam, listQuery };
