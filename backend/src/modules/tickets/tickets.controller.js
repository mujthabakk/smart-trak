const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./tickets.service');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(req.user, pagination, {
    status: req.query.status,
    priority: req.query.priority,
    school_id: req.query.school_id,
    mine: req.query.mine,
  });
  res.json(result);
});

const getTypes = asyncHandler(async (req, res) => {
  res.json({
    types: [
      'Vehicle Issue',
      'App Issue',
      'Student Issue',
      'Route Issue',
      'Other'
    ]
  });
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ ticket: await service.getById(req.params.id, req.user) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ ticket: await service.create(req.user, req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ ticket: await service.update(req.params.id, req.user, req.body) });
});

const addReply = asyncHandler(async (req, res) => {
  res.status(201).json({ ticket: await service.addReply(req.params.id, req.user, req.body.content) });
});

module.exports = { list, getTypes, getOne, create, update, addReply };
