const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./schools.controller');
const schema = require('./schools.validation');

const router = express.Router();

// Public — the marketing site's "Onboard your school" self-service signup.
// Must be registered before requireAuth below (no token exists yet for an
// anonymous applicant). Always creates as 'pending'; see schools.service.js's
// apply() for why it deliberately can't set status/plan_id itself.
router.post('/apply', validate({ body: schema.applySchool }), controller.apply);
// Also public — the onboarding wizard's live school_code availability check
// runs before the applicant has any token, same as the super_admin Add
// School form's own live check reuses this route once authenticated. Only
// ever returns a boolean, nothing sensitive.
router.get('/check-code', validate({ query: schema.checkCodeQuery }), controller.checkCode);

router.use(requireAuth);

// A school_admin may view/edit only their own school (enforced in the
// controller) — everything else (listing all schools, creating, deleting)
// stays super_admin-only, since those are platform-level operations.
router.get('/', requireRole('super_admin'), validate({ query: schema.listQuery }), controller.list);
router.get('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam }), controller.getOne);
router.post('/', requireRole('super_admin'), validate({ body: schema.createSchool }), controller.create);
router.patch('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam, body: schema.updateSchool }), controller.update);
router.delete('/:id', requireRole('super_admin'), validate({ params: schema.idParam }), controller.remove);
router.post('/:id/impersonate', requireRole('super_admin'), validate({ params: schema.idParam }), controller.impersonate);

module.exports = router;
