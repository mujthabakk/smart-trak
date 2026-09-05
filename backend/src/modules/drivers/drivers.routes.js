const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./drivers.controller');
const schema = require('./drivers.validation');

const router = express.Router();

router.use(requireAuth);

// Registered before '/:id' so these literal paths aren't swallowed as an
// :id value (Express matches routes in registration order) — same reason
// 'guest' needs its own GET here rather than relying on ?is_guest=true
// alone: GET /drivers/guest is the natural mirror of POST /drivers/guest,
// and without this it silently 404s as "Driver not found" instead of
// listing anything.
router.get('/expiring-documents', validate({ query: schema.expiringQuery }), controller.expiringDocuments);
router.get('/me/students', requireRole('driver'), controller.getRouteStudents);
router.get('/guest', validate({ query: schema.listQuery }), controller.listGuestDrivers);
router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post(
  '/',
  requireRole('super_admin', 'school_admin'),
  validate({ body: schema.createDriver }),
  controller.create
);
router.post(
  '/guest',
  requireRole('super_admin', 'school_admin'),
  validate({ body: schema.createGuestDriver }),
  controller.createGuestDriver
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
