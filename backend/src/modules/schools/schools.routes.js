const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./schools.controller');
const schema = require('./schools.validation');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin'));

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', validate({ body: schema.createSchool }), controller.create);
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateSchool }), controller.update);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);

module.exports = router;
