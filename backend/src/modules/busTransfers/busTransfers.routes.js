const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./busTransfers.controller');
const schema = require('./busTransfers.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin'),
  validate({ body: schema.createTransfer }),
  controller.create
);
// Driver-initiated: reports a problem on their own current trip, no bus
// chosen yet — that's the admin's job via PATCH /:id/assign below.
router.post(
  '/request',
  requireRole('driver'),
  validate({ body: schema.requestTransfer }),
  controller.requestTransfer
);
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin'),
  validate({ params: schema.idParam, body: schema.updateTransfer }),
  controller.update
);
router.patch(
  '/:id/assign',
  requireRole('super_admin', 'school_admin'),
  validate({ params: schema.idParam, body: schema.assignBus }),
  controller.assignBus
);

module.exports = router;
