const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./drivers.controller');
const schema = require('./drivers.validation');

const router = express.Router();

router.use(requireAuth);

// Registered before '/:id' so 'expiring-documents' isn't swallowed as an :id value.
router.get('/expiring-documents', validate({ query: schema.expiringQuery }), controller.expiringDocuments);
router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin'),
  validate({ body: schema.createDriver }),
  controller.create
);
router.patch(
  '/:id',
  requireRole('super_admin', 'school_admin'),
  validate({ params: schema.idParam, body: schema.updateDriver }),
  controller.update
);
router.delete(
  '/:id',
  requireRole('super_admin', 'school_admin'),
  validate({ params: schema.idParam }),
  controller.remove
);

module.exports = router;
