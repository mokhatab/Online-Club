'use strict';

/**
 * Layer: db/migrate — versioned schema migrations. Idempotent: safe to run
 * on every boot (`node src/db/migrate.js` and automatically from index.js).
 */
const { getDb, resolveDbPath } = require('./connection');

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial-schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
        avatar_url    TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS member_profiles (
        user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        phone             TEXT,
        city              TEXT,
        interests         TEXT DEFAULT '[]',
        newsletter_opt_in INTEGER NOT NULL DEFAULT 1,
        marketing_source  TEXT,
        updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        slug        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        category    TEXT NOT NULL DEFAULT 'meetup',
        location    TEXT NOT NULL DEFAULT '',
        starts_at   TEXT NOT NULL,
        ends_at     TEXT,
        capacity    INTEGER NOT NULL DEFAULT 50,
        price_cents INTEGER NOT NULL DEFAULT 0,
        currency    TEXT NOT NULL DEFAULT 'USD',
        image_url   TEXT,
        status      TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled')),
        created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

      CREATE TABLE IF NOT EXISTS bookings (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seats        INTEGER NOT NULL DEFAULT 1,
        status       TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed','waitlisted','cancelled')),
        booked_at    TEXT NOT NULL DEFAULT (datetime('now')),
        cancelled_at TEXT,
        UNIQUE (event_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

      CREATE TABLE IF NOT EXISTS integration_settings (
        key         TEXT PRIMARY KEY,
        enabled     INTEGER NOT NULL DEFAULT 0,
        config_json TEXT NOT NULL DEFAULT '{}',
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS marketing_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        provider   TEXT NOT NULL,
        event_type TEXT NOT NULL,
        status     TEXT NOT NULL CHECK (status IN ('sent','skipped','failed')),
        detail     TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_marketing_logs_created ON marketing_logs(created_at);

      CREATE TABLE IF NOT EXISTS inbound_webhooks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        provider   TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];

function migrate() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    db.exec(m.sql);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
    // eslint-disable-next-line no-console
    console.log(`[migrate] applied v${m.version} ${m.name}`);
  }
  return { database: resolveDbPath() };
}

if (require.main === module) {
  const { database } = migrate();
  // eslint-disable-next-line no-console
  console.log(`[migrate] database ready at ${database}`);
}

module.exports = { migrate };
