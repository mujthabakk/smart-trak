const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./training.controller');
const schema = require('./training.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', requireRole('super_admin'), validate({ body: schema.createModule }), controller.create);
router.patch(
  '/:id',
  requireRole('super_admin'),
  validate({ params: schema.idParam, body: schema.updateModule }),
  controller.update
);
router.delete('/:id', requireRole('super_admin'), validate({ params: schema.idParam }), controller.remove);

module.exports = router;
