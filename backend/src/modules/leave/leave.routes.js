const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./leave.controller');
const schema = require('./leave.validation');

const router = express.Router();

router.use(requireAuth);

// Reading is open to any authenticated role (e.g. a driver seeing who's on
// leave today); creating/editing/deleting a leave request is limited to
// admins and parents (parents restricted to their own children — enforced
// in the controller/service, not here, since it depends on the record).
router.get('/', validate({ query: schema.listQuery }), controller.list);
// Must come before /:id so "reasons" isn't captured as an :id param.
router.get('/reasons', controller.getReasons);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin', 'parent'),
  validate({ body: schema.createLeave }),
  controller.create
);
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin', 'parent'),
  validate({ params: schema.idParam, body: schema.updateLeave }),
  controller.update
);
router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin', 'parent'),
  validate({ params: schema.idParam }),
  controller.remove
);

module.exports = router;
