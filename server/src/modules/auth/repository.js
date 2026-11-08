'use strict';

/** Layer: repository (auth) — raw SQL only, no business logic. */
const { getDb } = require('../../db/connection');

const PUBLIC_COLUMNS = 'id, name, email, role, avatar_url, created_at';

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
}

function findById(id) {
  return getDb().prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
}

function create({ name, email, passwordHash, role = 'member' }) {
  const info = getDb()
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, String(email).toLowerCase(), passwordHash, role);
  return findById(info.lastInsertRowid);
}

function createProfile(userId, { phone = '', city = '', interests = [], newsletterOptIn = true, marketingSource = null } = {}) {
  getDb()
    .prepare(`INSERT INTO member_profiles (user_id, phone, city, interests, newsletter_opt_in, marketing_source)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, phone, city, JSON.stringify(interests), newsletterOptIn ? 1 : 0, marketingSource);
}

function getProfile(userId) {
  return getDb().prepare('SELECT * FROM member_profiles WHERE user_id = ?').get(userId);
}

module.exports = { findByEmail, findById, create, createProfile, getProfile };
