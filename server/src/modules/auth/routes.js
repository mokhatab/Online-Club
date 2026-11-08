'use strict';

/** Layer: routes (auth) — URL map → middleware chain → controller. */
const { Router } = require('express');
const controller = require('./controller');
const { validate } = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');

const router = Router();

router.post('/register', validate({ body: controller.registerSchema }), controller.register);
router.post('/login', validate({ body: controller.loginSchema }), controller.login);
router.get('/me', requireAuth, controller.me);

module.exports = router;
