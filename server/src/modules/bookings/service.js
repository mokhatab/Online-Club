'use strict';

/**
 * Layer: service (bookings) — talks to the EVENTS service (capacity/rules)
 * and emits events for the MARKETING service. Services calling services =
 * the internal APIs talking to each other; the DB is only touched inside
 * repositories within a transaction.
 */
const repo = require('./repository');
const eventsService = require('../events/service');
const authRepository = require('../auth/repository');
const { HttpError } = require('../../core/errors');
const { emit } = require('../../core/eventBus');
const { transaction } = require('../../db/connection');

function bookEvent(eventId, userId, seats = 1) {
  const event = eventsService.getEvent({ id: eventId });
  if (event.status !== 'published') throw HttpError.badRequest('This event is not open for booking');
  if (new Date(event.starts_at).getTime() < Date.now()) throw HttpError.badRequest('This event already started');
  if (seats < 1 || seats > 10) throw HttpError.badRequest('You can book between 1 and 10 seats');

  const booking = transaction(() => {
    const existing = repo.findExisting(eventId, userId);
    if (existing && existing.status !== 'cancelled') {
      throw HttpError.conflict('You already booked this event');
    }
    const taken = repo.confirmedSeats(eventId);
    const status = taken + seats <= event.capacity ? 'confirmed' : 'waitlisted';
    // Re-booking after a cancel reuses the row semantics via delete+insert for simplicity:
    if (existing && existing.status === 'cancelled') {
      const { getDb } = require('../../db/connection');
      getDb().prepare('DELETE FROM bookings WHERE id = ?').run(existing.id);
    }
    return repo.create({ eventId, userId, seats, status });
  });

  const user = authRepository.findById(userId);
  emit('booking.created', {
    booking: { id: booking.id, seats: booking.seats, status: booking.status },
    event: eventsService.publicEvent(event),
    user: { id: user.id, name: user.name, email: user.email },
  });
  return booking;
}

function cancelBooking(bookingId, userId, isAdmin = false) {
  const { getDb } = require('../../db/connection');
  const booking = getDb().prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) throw HttpError.notFound('Booking not found');
  if (!isAdmin && booking.user_id !== userId) throw HttpError.forbidden('Not your booking');
  if (booking.status === 'cancelled') throw HttpError.badRequest('Booking is already cancelled');

  const { cancelled, promoted } = transaction(() => {
    const c = repo.cancel(bookingId);
    const p = repo.promoteFirstWaitlisted(booking.event_id);
    return { cancelled: c, promoted: p };
  });

  const event = eventsService.getEvent({ id: booking.event_id });
  const user = authRepository.findById(booking.user_id);
  emit('booking.cancelled', {
    booking: { id: cancelled.id, seats: cancelled.seats },
    event: eventsService.publicEvent(event),
    user: { id: user.id, name: user.name, email: user.email },
    promoted_booking_id: promoted ? promoted.id : null,
  });
  return { ...cancelled, promoted_booking_id: promoted ? promoted.id : null };
}

function myBookings(userId) {
  return repo.listMine(userId);
}

function eventBookings(eventId) {
  eventsService.getEvent({ id: eventId }); // 404 if missing
  return repo.listForEvent(eventId);
}

module.exports = { bookEvent, cancelBooking, myBookings, eventBookings };
