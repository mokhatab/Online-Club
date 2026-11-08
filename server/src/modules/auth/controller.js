'use strict';

/** Layer: controller (auth) — HTTP in/out only, delegates to the service. */
const { z } = require('zod');
const service = require('./service');

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(160),
  password: z.string().min(8).max(100),
  city: z.string().max(80).optional().default(''),
  interests: z.array(z.string().max(40)).max(10).optional().default([]),
  newsletterOptIn: z.boolean().optional().default(true),
  marketingSource: z.string().max(80).optional().nullable().default(null),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function register(req, res, next) {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    res.json(await service.login(req.body));
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    res.json({ user: service.me(req.user.sub) });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, registerSchema, loginSchema };
