const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./notifications.controller');
const schema = require('./notifications.validation');

const router = express.Router();

// Every route here is a per-user inbox operation, scoped to req.user.id in
// the service layer — no resolveSchoolId tenant-scoping in this module.
router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/unread-count', controller.getUnreadCount);
// Only admin actions push notifications to arbitrary users through the
// public API; other modules should import createNotification directly.
router.post('/', requireRole('super_admin', 'school_admin'), validate({ body: schema.createNotification }), controller.create);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate({ params: schema.idParam }), controller.markRead);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);

module.exports = router;
