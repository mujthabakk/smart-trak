const asyncHandler = require('../../utils/asyncHandler');
const service = require('./featureCatalog.service');

const list = asyncHandler(async (req, res) => {
  res.json({ features: await service.list() });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ feature: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ feature: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, create, update, remove };
