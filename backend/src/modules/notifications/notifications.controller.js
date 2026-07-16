const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./notifications.service');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(req.user.id, pagination, {
    is_read: req.query.is_read,
    type: req.query.type,
  });
  res.json(result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  res.json({ count: await service.unreadCount(req.user.id) });
});

const create = asyncHandler(async (req, res) => {
  const notification = await service.createNotification(req.body);
  res.status(201).json({ notification });
});

const markRead = asyncHandler(async (req, res) => {
  res.json({ notification: await service.markRead(req.params.id, req.user.id) });
});

const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user.id);
  res.status(204).send();
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id);
  res.status(204).send();
});

module.exports = { list, getUnreadCount, create, markRead, markAllRead, remove };
