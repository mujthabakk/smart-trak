const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./classes.controller');
const schema = require('./classes.validation');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin', 'school_admin'));

router.get('/', controller.list);
router.post('/', validate({ body: schema.createClass }), controller.create);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);
router.post('/:id/divisions', validate({ params: schema.idParam, body: schema.createDivision }), controller.addDivision);
router.delete('/:id/divisions/:divisionId', validate({ params: schema.classDivisionParams }), controller.removeDivision);

module.exports = router;
