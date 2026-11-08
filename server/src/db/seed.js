'use strict';

/**
 * Layer: db/seed — demo data (admin, members, events, bookings,
 * default marketing-integration rows). Idempotent: skips when data exists.
 */
const bcrypt = require('bcryptjs');
const { getDb } = require('./connection');
const { migrate } = require('./migrate');
const env = require('../config/env');
const { PROVIDER_KEYS } = require('../integrations/marketing');

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  migrate();
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (existing > 0) {
    // eslint-disable-next-line no-console
    console.log('[seed] users already exist, skipping');
    return { skipped: true };
  }

  const adminHash = await bcrypt.hash(env.seedAdminPassword, 10);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const insertProfile = db.prepare(
    'INSERT INTO member_profiles (user_id, phone, city, interests, newsletter_opt_in, marketing_source) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const adminId = insertUser.run('Club Admin', env.seedAdminEmail, adminHash, 'admin').lastInsertRowid;
  insertProfile.run(adminId, '', 'Suez', JSON.stringify(['community']), 1, 'seed');

  const members = [
    ['Salma Nour', 'salma@example.com', 'Cairo', ['music', 'art']],
    ['Omar Khaled', 'omar@example.com', 'Suez', ['sports', 'tech']],
    ['Lina Adel', 'lina@example.com', 'Alexandria', ['books', 'movies']],
    ['Youssef Samy', 'youssef@example.com', 'Giza', ['gaming', 'tech']],
  ];
  const memberIds = [];
  const memberHash = await bcrypt.hash('Member123!', 10);
  for (const [name, email, city, interests] of members) {
    const id = insertUser.run(name, email, memberHash, 'member').lastInsertRowid;
    insertProfile.run(id, '', city, JSON.stringify(interests), 1, 'seed');
    memberIds.push(id);
  }

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const iso = (t) => new Date(t).toISOString();
  const events = [
    ['Friday Community Night', 'meetup', 'Main Hall, Suez', now + 2 * day, 120, 0, 'Live music, open mic and board games. Bring a friend!'],
    ['Sunrise Beach Cleanup', 'volunteering', 'Adabiya Beach', now + 5 * day, 60, 0, 'Help keep our coast clean. Gloves and bags provided.'],
    ['Intro to Photography Walk', 'workshop', 'Port Tawfik', now + 7 * day, 25, 1500, 'A sunset photo walk with mentor feedback. All levels welcome.'],
    ['Startup Pitch Evening', 'networking', 'Club Rooftop', now + 9 * day, 80, 0, 'Five local founders pitch. Vote for the community favourite.'],
    ['Family Sports Day', 'sports', 'Club Grounds', now + 12 * day, 200, 500, 'Football, padel tasters and kids races. Food trucks on site.'],
    ['Arabic Calligraphy Basics', 'workshop', 'Art Room', now + 14 * day, 20, 2500, 'Two-hour hands-on calligraphy session. Materials included.'],
  ];
  const insertEvent = db.prepare(
    `INSERT INTO events (title, slug, description, category, location, starts_at, ends_at,
      capacity, price_cents, currency, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', 'published', ?)`
  );
  const eventIds = events.map(([title, category, location, start, capacity, price, desc]) =>
    insertEvent.run(title, slugify(title), desc, category, location, iso(start), iso(start + 3 * 3600 * 1000), capacity, price, adminId).lastInsertRowid
  );

  const insertBooking = db.prepare(
    'INSERT INTO bookings (event_id, user_id, seats, status) VALUES (?, ?, ?, ?)'
  );
  insertBooking.run(eventIds[0], memberIds[0], 2, 'confirmed');
  insertBooking.run(eventIds[0], memberIds[1], 1, 'confirmed');
  insertBooking.run(eventIds[2], memberIds[2], 1, 'confirmed');
  insertBooking.run(eventIds[3], memberIds[3], 1, 'waitlisted');

  const upsertIntegration = db.prepare(
    `INSERT INTO integration_settings (key, enabled, config_json)
     VALUES (?, 0, ?) ON CONFLICT(key) DO NOTHING`
  );
  for (const key of PROVIDER_KEYS) upsertIntegration.run(key, '{}');

  // eslint-disable-next-line no-console
  console.log(`[seed] created admin (${env.seedAdminEmail}) + ${memberIds.length} members + ${eventIds.length} events`);
  return { skipped: false };
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seed] failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };
