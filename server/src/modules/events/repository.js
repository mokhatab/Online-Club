'use strict';

/** Layer: repository (events) — SQL only. */
const { getDb } = require('../../db/connection');

const SELECT_WITH_BOOKED = `
  SELECT e.*,
    COALESCE((SELECT SUM(seats) FROM bookings b
              WHERE b.event_id = e.id AND b.status = 'confirmed'), 0) AS booked_seats,
    (SELECT COUNT(*) FROM bookings b
      WHERE b.event_id = e.id AND b.status = 'waitlisted') AS waitlisted_count
  FROM events e
`;

function list({ status = 'published', category, upcomingOnly = true, limit = 50, offset = 0 } = {}) {
  const conds = [];
  const args = [];
  if (status && status !== 'all') { conds.push('e.status = ?'); args.push(status); }
  if (category) { conds.push('e.category = ?'); args.push(category); }
  if (upcomingOnly) { conds.push("e.starts_at >= datetime('now')"); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = getDb()
    .prepare(`${SELECT_WITH_BOOKED} ${where} ORDER BY e.starts_at ASC LIMIT ? OFFSET ?`)
    .all(...args, limit, offset);
  const { n } = getDb().prepare(`SELECT COUNT(*) AS n FROM events e ${where}`).get(...args);
  return { rows, total: n };
}

function findById(id) {
  return getDb().prepare(`${SELECT_WITH_BOOKED} WHERE e.id = ?`).get(id);
}

function findBySlug(slug) {
  return getDb().prepare(`${SELECT_WITH_BOOKED} WHERE e.slug = ?`).get(slug);
}

function slugExists(slug) {
  return !!getDb().prepare('SELECT 1 FROM events WHERE slug = ?').get(slug);
}

function create(data) {
  const info = getDb()
    .prepare(`INSERT INTO events (title, slug, description, category, location, starts_at,
               ends_at, capacity, price_cents, currency, image_url, status, created_by)
              VALUES (@title, @slug, @description, @category, @location, @starts_at,
               @ends_at, @capacity, @price_cents, @currency, @image_url, @status, @created_by)`)
    .run(data);
  return findById(info.lastInsertRowid);
}

function update(id, patch) {
  const allowed = ['title', 'slug', 'description', 'category', 'location', 'starts_at', 'ends_at',
    'capacity', 'price_cents', 'currency', 'image_url', 'status'];
  const sets = Object.keys(patch).filter((k) => allowed.includes(k)).map((k) => `${k} = @${k}`);
  if (!sets.length) return findById(id);
  getDb().prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = @id`).run({ ...patch, id });
  return findById(id);
}

function remove(id) {
  return getDb().prepare('DELETE FROM events WHERE id = ?').run(id).changes > 0;
}

function categories() {
  return getDb().prepare('SELECT DISTINCT category FROM events ORDER BY category').all().map((r) => r.category);
}

module.exports = { list, findById, findBySlug, slugExists, create, update, remove, categories };
