'use strict';

/** Layer: routes (members). */
const { Router } = require('express');
const controller = require('./controller');
const { validate } = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

const router = Router();

router.get('/stats', controller.stats); // public counter for the landing page
router.get('/', requireAuth, requireAdmin, validate({ query: controller.listQuerySchema }), controller.list);

module.exports = router;
