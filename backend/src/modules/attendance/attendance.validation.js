const { z } = require('zod');

const statusEnum = z.enum(['present', 'absent', 'leave']);

const markAttendance = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().min(1),
  student_id: z.string().min(1),
  stop_id: z.string().optional(),
  status: statusEnum,
  pickup_time: z.string().optional(),
  drop_time: z.string().optional(),
  date: z.string().optional(),
});

const bulkRecordInput = z.object({
  student_id: z.string().min(1),
  status: statusEnum,
  stop_id: z.string().optional(),
});

const bulkMark = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().min(1),
  records: z.array(bulkRecordInput).min(1),
});

const updateAttendance = z.object({
  status: statusEnum.optional(),
  stop_id: z.string().optional(),
  pickup_time: z.string().optional(),
  drop_time: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

const listQuery = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().optional(),
  student_id: z.string().optional(),
  date: z.string().optional(),
  status: statusEnum.optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

module.exports = { markAttendance, bulkMark, updateAttendance, idParam, listQuery };
