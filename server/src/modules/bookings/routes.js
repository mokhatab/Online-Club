'use strict';

/** Layer: routes (bookings). */
const { Router } = require('express');
const controller = require('./controller');
const { validate } = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

const router = Router();

router.post('/', requireAuth, validate({ body: controller.bookSchema }), controller.book);
router.get('/mine', requireAuth, controller.mine);
router.get('/event/:eventId', requireAuth, requireAdmin, controller.forEvent);
router.post('/:id/cancel', requireAuth, controller.cancel);

module.exports = router;
