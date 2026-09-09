const { z } = require('zod');

const createClass = z.object({
  school_id: z.string().optional(),
  name: z.string().min(1).max(30),
});

const createDivision = z.object({
  name: z.string().min(1).max(10),
});

const idParam = z.object({ id: z.string().min(1) });

const classDivisionParams = z.object({
  id: z.string().min(1),
  divisionId: z.string().min(1),
});

module.exports = { createClass, createDivision, idParam, classDivisionParams };
