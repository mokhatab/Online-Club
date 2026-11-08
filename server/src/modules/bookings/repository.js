'use strict';

/** Layer: repository (bookings) — SQL only. */
const { getDb } = require('../../db/connection');

function confirmedSeats(eventId) {
  return getDb()
    .prepare("SELECT COALESCE(SUM(seats),0) AS n FROM bookings WHERE event_id = ? AND status = 'confirmed'")
    .get(eventId).n;
}

function findExisting(eventId, userId) {
  return getDb().prepare('SELECT * FROM bookings WHERE event_id = ? AND user_id = ?').get(eventId, userId);
}

function create({ eventId, userId, seats, status }) {
  const info = getDb()
    .prepare('INSERT INTO bookings (event_id, user_id, seats, status) VALUES (?, ?, ?, ?)')
    .run(eventId, userId, seats, status);
  return getDb().prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
}

function cancel(id) {
  getDb().prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?").run(id);
  return getDb().prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

function promoteFirstWaitlisted(eventId) {
  const row = getDb()
    .prepare("SELECT * FROM bookings WHERE event_id = ? AND status = 'waitlisted' ORDER BY booked_at ASC LIMIT 1")
    .get(eventId);
  if (!row) return null;
  getDb().prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(row.id);
  return { ...row, status: 'confirmed' };
}

function listMine(userId) {
  return getDb()
    .prepare(`SELECT b.*, e.title, e.slug, e.starts_at, e.location, e.image_url
              FROM bookings b JOIN events e ON e.id = b.event_id
              WHERE b.user_id = ? ORDER BY e.starts_at ASC`)
    .all(userId);
}

function listForEvent(eventId) {
  return getDb()
    .prepare(`SELECT b.*, u.name AS user_name, u.email AS user_email
              FROM bookings b JOIN users u ON u.id = b.user_id
              WHERE b.event_id = ? ORDER BY b.booked_at ASC`)
    .all(eventId);
}

module.exports = { confirmedSeats, findExisting, create, cancel, promoteFirstWaitlisted, listMine, listForEvent };
