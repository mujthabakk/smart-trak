const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./training.service');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(req.user, pagination, {
    target_role: req.query.target_role,
    is_published: req.query.is_published,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ trainingModule: await service.getById(req.params.id, req.user) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ trainingModule: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ trainingModule: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
