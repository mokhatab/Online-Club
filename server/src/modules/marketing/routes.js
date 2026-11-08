'use strict';

/** Layer: routes (marketing). */
const { Router } = require('express');
const controller = require('./controller');
const { validate } = require('../../middlewares/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../../middlewares/auth');

const router = Router();

// Public: browser snippet config + inbound receiver URLs for toolkits.
router.get('/public-config', controller.pubConfig);
router.post('/inbound/:provider', controller.inbound);

// Authenticated tracking relay (web client calls this on key actions).
router.post('/track', optionalAuth, validate({ body: controller.trackSchema }), controller.track);

// Admin: manage integrations, view logs.
router.get('/integrations', requireAuth, requireAdmin, controller.list);
router.put('/integrations/:key', requireAuth, requireAdmin, validate({ body: controller.updateSchema }), controller.update);
router.post('/integrations/:key/test', requireAuth, requireAdmin, controller.test);
router.get('/logs', requireAuth, requireAdmin, controller.logs);
router.get('/inbound', requireAuth, requireAdmin, controller.inboundList);

module.exports = router;
