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
  const io = req.app.get('io');
  if (io && notification.user_id) io.to(`user:${notification.user_id}`).emit('notification:update');
  res.status(201).json({ notification });
});

const broadcast = asyncHandler(async (req, res) => {
  const result = await service.broadcastNotification(req.user.school_id, req.user.id, req.body);
  const io = req.app.get('io');
  if (io && result.userIds) {
    // Socket.IO supports arrays in the to() method to emit to multiple rooms efficiently
    io.to(result.userIds.map(id => `user:${id}`)).emit('notification:update');
  }
  res.status(201).json({ count: result.count, message: result.message });
});

const listBroadcasts = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.listBroadcasts(req.user.school_id, pagination);
  res.json(result);
});

const updateBroadcast = asyncHandler(async (req, res) => {
  const result = await service.updateBroadcast(req.user.school_id, req.params.id, req.body);
  const io = req.app.get('io');
  if (io && result.userIds) {
    io.to(result.userIds.map(id => `user:${id}`)).emit('notification:update');
  }
  res.json({ message: 'Broadcast updated successfully' });
});

const deleteBroadcast = asyncHandler(async (req, res) => {
  const result = await service.deleteBroadcast(req.user.school_id, req.params.id);
  const io = req.app.get('io');
  if (io && result.userIds) {
    io.to(result.userIds.map(id => `user:${id}`)).emit('notification:update');
  }
  res.status(204).send();
});

const markRead = asyncHandler(async (req, res) => {
  const result = await service.markRead(req.params.id, req.user.id);
  const io = req.app.get('io');
  if (io) io.to(`user:${req.user.id}`).emit('notification:update');
  res.json({ notification: result });
});

const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user.id);
  const io = req.app.get('io');
  if (io) io.to(`user:${req.user.id}`).emit('notification:update');
  res.status(204).send();
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id);
  const io = req.app.get('io');
  if (io) io.to(`user:${req.user.id}`).emit('notification:update');
  res.status(204).send();
});

module.exports = { list, getUnreadCount, create, broadcast, listBroadcasts, updateBroadcast, deleteBroadcast, markRead, markAllRead, remove };
