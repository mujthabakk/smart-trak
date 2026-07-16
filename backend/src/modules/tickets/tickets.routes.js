const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./tickets.controller');
const schema = require('./tickets.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', validate({ body: schema.createTicket }), controller.create);
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateTicket }), controller.update);
router.post('/:id/replies', validate({ params: schema.idParam, body: schema.addReply }), controller.addReply);

module.exports = router;
