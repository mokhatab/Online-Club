'use strict';

/** Layer: controller (members). */
const { z } = require('zod');
const service = require('./service');

const listQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function list(req, res, next) {
  try {
    res.json(service.listMembers(req.query));
  } catch (err) {
    next(err);
  }
}

function stats(_req, res, next) {
  try {
    res.json(service.getStats());
  } catch (err) {
    next(err);
  }
}

module.exports = { list, stats, listQuerySchema };
