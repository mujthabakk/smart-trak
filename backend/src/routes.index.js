const express = require('express');

const router = express.Router();

router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/plans', require('./modules/plans/plans.routes'));
router.use('/schools', require('./modules/schools/schools.routes'));
router.use('/subscriptions', require('./modules/subscriptions/subscriptions.routes'));
router.use('/users', require('./modules/users/users.routes'));
router.use('/students', require('./modules/students/students.routes'));
router.use('/drivers', require('./modules/drivers/drivers.routes'));
router.use('/buses', require('./modules/buses/buses.routes'));
router.use('/routes', require('./modules/routesResource/routes.routes'));
router.use('/trips', require('./modules/trips/trips.routes'));
router.use('/attendance', require('./modules/attendance/attendance.routes'));
router.use('/leave', require('./modules/leave/leave.routes'));
router.use('/lost-found', require('./modules/lostFound/lostFound.routes'));
router.use('/bus-transfers', require('./modules/busTransfers/busTransfers.routes'));
router.use('/guest-trips', require('./modules/guestTrips/guestTrips.routes'));
router.use('/messages', require('./modules/messages/messages.routes'));
router.use('/notifications', require('./modules/notifications/notifications.routes'));
router.use('/tickets', require('./modules/tickets/tickets.routes'));
router.use('/training', require('./modules/training/training.routes'));
router.use('/audit-logs', require('./modules/auditLogs/auditLogs.routes'));
router.use('/reports', require('./modules/reports/reports.routes'));

module.exports = router;
