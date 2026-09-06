const asyncHandler = require('../../utils/asyncHandler');
const service = require('./platformSettings.service');

const getSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await service.get() });
});

const updateSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await service.update(req.body) });
});

module.exports = { getSettings, updateSettings };
