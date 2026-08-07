const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./featureCatalog.controller');
const schema = require('./featureCatalog.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', controller.list);
router.post('/', requireRole('super_admin'), validate({ body: schema.createItem }), controller.create);
router.patch('/:id', requireRole('super_admin'), validate({ params: schema.idParam, body: schema.updateItem }), controller.update);
router.delete('/:id', requireRole('super_admin'), validate({ params: schema.idParam }), controller.remove);

module.exports = router;
