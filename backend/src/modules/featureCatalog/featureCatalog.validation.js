const { z } = require('zod');

const createItem = z.object({
  name: z.string().min(1),
});

const updateItem = createItem.partial();

const idParam = z.object({ id: z.string().min(1) });

module.exports = { createItem, updateItem, idParam };
