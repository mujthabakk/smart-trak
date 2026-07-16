const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./attendance.controller');
const schema = require('./attendance.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ body: schema.markAttendance }),
  controller.mark
);
router.post(
  '/bulk',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ body: schema.bulkMark }),
  controller.bulk
);
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ params: schema.idParam, body: schema.updateAttendance }),
  controller.update
);
router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ params: schema.idParam }),
  controller.remove
);

module.exports = router;
