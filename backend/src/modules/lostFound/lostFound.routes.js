const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./lostFound.controller');
const schema = require('./lostFound.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ body: schema.reportItem }),
  controller.create
);
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ params: schema.idParam, body: schema.updateItem }),
  controller.update
);
router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin', 'driver'),
  validate({ params: schema.idParam }),
  controller.remove
);

// Claiming an item is initiated by the student/parent side, not the "writer" roles above,
// so these two are only gated by requireAuth (any authenticated same-school user may claim
// or update a claim's status).
router.post(
  '/:id/claims',
  validate({ params: schema.idParam, body: schema.createClaim }),
  controller.addClaim
);
router.patch(
  '/:id/claims/:claimId',
  validate({ params: schema.claimParams, body: schema.updateClaim }),
  controller.updateClaim
);

module.exports = router;
