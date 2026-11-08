'use strict';

/** Layer: controller (events). */
const { z } = require('zod');
const service = require('./service');

const listQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'published', 'cancelled']).optional().default('published'),
  category: z.string().max(60).optional(),
  upcomingOnly: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const eventBodySchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().max(100).optional(),
  description: z.string().max(5000).optional().default(''),
  category: z.string().max(60).optional().default('meetup'),
  location: z.string().max(200).optional().default(''),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(100000).optional().default(50),
  price_cents: z.coerce.number().int().min(0).optional().default(0),
  currency: z.string().length(3).optional().default('USD'),
  image_url: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional().default('published'),
});

const patchBodySchema = eventBodySchema.partial();

function list(req, res, next) {
  try {
    res.json(service.listEvents(req.query));
  } catch (err) {
    next(err);
  }
}

function categories(_req, res, next) {
  try {
    res.json({ categories: service.listCategories() });
  } catch (err) {
    next(err);
  }
}

function getOne(req, res, next) {
  try {
    res.json(service.getEvent({ slug: req.params.slug }));
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    res.status(201).json(service.createEvent(req.body, req.user.sub));
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    res.json(service.updateEvent(Number(req.params.id), { ...req.body }));
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    res.json(service.deleteEvent(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, categories, getOne, create, update, remove, listQuerySchema, eventBodySchema, patchBodySchema };
