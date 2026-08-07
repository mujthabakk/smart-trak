const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./qr.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/:code', controller.resolve);

module.exports = router;
