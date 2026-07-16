const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./guestTrips.controller');
const schema = require('./guestTrips.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
// Any authenticated same-school user may request a guest trip.
router.post('/', validate({ body: schema.createTrip }), controller.create);
// Any authenticated same-school user may PATCH (e.g. mark completed); approving/rejecting
// is further gated to admins inside the controller.
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateTrip }), controller.update);

module.exports = router;
