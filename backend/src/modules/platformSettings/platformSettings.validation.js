const { z } = require('zod');
const { isValidTimezone } = require('../../utils/timezone');

const updateSettings = z.object({
  default_timezone: z.string().refine(isValidTimezone, 'Unknown timezone'),
});

module.exports = { updateSettings };
