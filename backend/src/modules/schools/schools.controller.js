const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./schools.service');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(pagination, {
    search: req.query.search,
    status: req.query.status,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ school: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ school: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ school: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
