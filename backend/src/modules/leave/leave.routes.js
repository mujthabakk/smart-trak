const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./leave.controller');
const schema = require('./leave.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', validate({ body: schema.createLeave }), controller.create);
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateLeave }), controller.update);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);

module.exports = router;
