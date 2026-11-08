'use strict';

/** Layer: routes (events). */
const { Router } = require('express');
const controller = require('./controller');
const { validate } = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

const router = Router();

router.get('/', validate({ query: controller.listQuerySchema }), controller.list);
router.get('/categories', controller.categories);
router.get('/:slug', controller.getOne);
router.post('/', requireAuth, requireAdmin, validate({ body: controller.eventBodySchema }), controller.create);
router.patch('/:id', requireAuth, requireAdmin, validate({ body: controller.patchBodySchema }), controller.update);
router.delete('/:id', requireAuth, requireAdmin, controller.remove);

module.exports = router;
