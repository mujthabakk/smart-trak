const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./subscriptions.controller');
const schema = require('./subscriptions.validation');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin'));

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', validate({ body: schema.createSubscription }), controller.create);
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateSubscription }), controller.update);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);

module.exports = router;
