'use strict';

/** Layer: repository (members). */
const { getDb } = require('../../db/connection');

function list({ search = '', limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const where = search ? 'WHERE u.name LIKE ? OR u.email LIKE ?' : '';
  const like = `%${search}%`;
  const rows = db
    .prepare(`SELECT u.id, u.name, u.email, u.role, u.created_at,
                     p.city, p.newsletter_opt_in, p.marketing_source
              FROM users u LEFT JOIN member_profiles p ON p.user_id = u.id
              ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`)
    .all(...(search ? [like, like, limit, offset] : [limit, offset]));
  const { n } = db
    .prepare(`SELECT COUNT(*) AS n FROM users u ${where}`)
    .get(...(search ? [like, like] : []));
  return { rows, total: n };
}

function stats() {
  const db = getDb();
  return {
    members: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'member'").get().n,
    newsletter_subscribers: db.prepare('SELECT COUNT(*) AS n FROM member_profiles WHERE newsletter_opt_in = 1').get().n,
    events_published: db.prepare("SELECT COUNT(*) AS n FROM events WHERE status = 'published'").get().n,
    bookings_confirmed: db.prepare("SELECT COALESCE(SUM(seats),0) AS n FROM bookings WHERE status = 'confirmed'").get().n,
  };
}

function setNewsletterOptIn(userId, optIn) {
  getDb().prepare('UPDATE member_profiles SET newsletter_opt_in = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
    .run(optIn ? 1 : 0, userId);
}

module.exports = { list, stats, setNewsletterOptIn };
