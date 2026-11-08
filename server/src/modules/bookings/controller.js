'use strict';

/** Layer: controller (bookings). */
const { z } = require('zod');
const service = require('./service');

const bookSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  seats: z.coerce.number().int().min(1).max(10).optional().default(1),
});

function book(req, res, next) {
  try {
    res.status(201).json(service.bookEvent(req.body.event_id, req.user.sub, req.body.seats));
  } catch (err) {
    next(err);
  }
}

function cancel(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    res.json(service.cancelBooking(Number(req.params.id), req.user.sub, isAdmin));
  } catch (err) {
    next(err);
  }
}

function mine(req, res, next) {
  try {
    res.json({ bookings: service.myBookings(req.user.sub) });
  } catch (err) {
    next(err);
  }
}

function forEvent(req, res, next) {
  try {
    res.json({ bookings: service.eventBookings(Number(req.params.eventId)) });
  } catch (err) {
    next(err);
  }
}

module.exports = { book, cancel, mine, forEvent, bookSchema };
