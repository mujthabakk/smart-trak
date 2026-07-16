const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./trips.controller');
const schema = require('./trips.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin'),
  validate({ body: schema.createTrip }),
  controller.create
);
// school_admin/super_admin may PATCH any field; drivers may PATCH only the
// status of their own trip (enforced in the controller, since it depends on
// the trip's driver_id rather than a static role check).
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ params: schema.idParam, body: schema.updateTrip }),
  controller.update
);
router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin'),
  validate({ params: schema.idParam }),
  controller.remove
);

module.exports = router;
