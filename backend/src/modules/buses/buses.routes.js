const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./buses.controller');
const schema = require('./buses.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.get('/:id/location', validate({ params: schema.idParam }), controller.getLocation);
router.post('/', requireRole('super_admin', 'school_admin'), validate({ body: schema.createBuses }), controller.create);
router.patch('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam, body: schema.updateBus }), controller.update);
router.delete('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam }), controller.remove);

module.exports = router;
