const asyncHandler = require('../../utils/asyncHandler');
const service = require('./plans.service');

const list = asyncHandler(async (req, res) => {
  res.json({ plans: await service.list() });
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ plan: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ plan: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ plan: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
