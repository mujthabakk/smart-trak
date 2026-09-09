const { z } = require('zod');

const askQuestion = z.object({
  question: z.string().min(1).max(500),
});

module.exports = { askQuestion };
