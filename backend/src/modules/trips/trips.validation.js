const { z } = require('zod');

const tripStatus = z.enum(['not_started', 'in_progress', 'completed']);

const createTrip = z.object({
  route_id: z.string().min(1),
  driver_id: z.string().min(1),
  bus_id: z.string().min(1),
  trip_type: z.enum(['pickup', 'drop']),
  status: tripStatus.optional(),
  trip_date: z.string().optional(),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
});

const updateTrip = z.object({
  route_id: z.string().min(1).optional(),
  driver_id: z.string().min(1).optional(),
  bus_id: z.string().min(1).optional(),
  trip_type: z.enum(['pickup', 'drop']).optional(),
  status: tripStatus.optional(),
  trip_date: z.string().optional(),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  route_id: z.string().optional(),
  bus_id: z.string().optional(),
  driver_id: z.string().optional(),
  status: tripStatus.optional(),
  date: z.string().optional(),
});

module.exports = { createTrip, updateTrip, idParam, listQuery };
