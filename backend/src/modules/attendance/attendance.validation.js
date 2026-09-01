const { z } = require('zod');

const statusEnum = z.enum(['present', 'absent', 'leave']);

const markAttendance = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().min(1),
  type: z.enum(['pickup', 'drop']).optional(),
  date: z.string().optional(),
  records: z.array(z.object({
    student_id: z.string().min(1),
    stop_id: z.string().optional(),
    status: statusEnum
  })).min(1),
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

const bulkOffboardRecordInput = z.object({
  attendance_id: z.string().min(1),
  offboard_status: z.enum(['offboarded', 'not_offboarded']),
  offboard_reason: z.enum(['parent_not_available', 'student_asleep', 'wrong_stop', 'returned_to_school', 'other']).optional(),
  drop_time: z.string().optional(),
});

const bulkOffboard = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().min(1),
  records: z.array(bulkOffboardRecordInput).min(1),
});

const scanAttendance = z.object({
  school_id: z.string().optional(),
  trip_id: z.string().min(1),
  qr_code: z.string().min(1),
  stop_id: z.string().optional(),
});

const updateAttendance = z.object({
  status: statusEnum.optional(),
  stop_id: z.string().optional(),
  pickup_time: z.string().optional(),
  drop_time: z.string().optional(),
  offboard_status: z.enum(['offboarded', 'not_offboarded']).optional(),
  offboard_reason: z.enum(['parent_not_available', 'student_asleep', 'wrong_stop', 'returned_to_school', 'other']).optional(),
});

const daySummaryQuery = z.object({
  student_id: z.string().min(1),
  date: z.string().min(1),
  school_id: z.string().optional(),
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

module.exports = { markAttendance, bulkMark, bulkOffboard, scanAttendance, updateAttendance, idParam, listQuery, daySummaryQuery };
