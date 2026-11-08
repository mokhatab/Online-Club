'use strict';

/**
 * Layer: service (auth) — business rules. Talks to OTHER services via the
 * event bus: on signup it emits 'member.registered' which the marketing
 * module picks up (email sync, pixels, webhooks).
 */
const bcrypt = require('bcryptjs');
const repo = require('./repository');
const { signToken } = require('../../utils/jwt');
const { HttpError } = require('../../core/errors');
const { emit } = require('../../core/eventBus');
const { transaction } = require('../../db/connection');

function toPublic(user, profile) {
  return {
    ...user,
    profile: profile
      ? {
          phone: profile.phone,
          city: profile.city,
          interests: JSON.parse(profile.interests || '[]'),
          newsletter_opt_in: !!profile.newsletter_opt_in,
          marketing_source: profile.marketing_source,
        }
      : null,
  };
}

async function register({ name, email, password, city, interests, newsletterOptIn, marketingSource }) {
  if (repo.findByEmail(email)) throw HttpError.conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = transaction(() => {
    const created = repo.create({ name, email, passwordHash });
    repo.createProfile(created.id, { city, interests, newsletterOptIn, marketingSource });
    return created;
  });
  const profile = repo.getProfile(user.id);
  const publicUser = toPublic(user, profile);
  // Internal API-to-API call: notify marketing (non-blocking for the request).
  emit('member.registered', { user: { id: user.id, name: user.name, email: user.email }, source: marketingSource || 'organic' });
  return { user: publicUser, token: signToken(user) };
}

async function login({ email, password }) {
  const user = repo.findByEmail(email);
  if (!user) throw HttpError.unauthorized('Invalid email or password');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw HttpError.unauthorized('Invalid email or password');
  const profile = repo.getProfile(user.id);
  const { password_hash: _omit, ...safe } = user;
  return { user: toPublic(safe, profile), token: signToken(user) };
}

function me(userId) {
  const user = repo.findById(userId);
  if (!user) throw HttpError.notFound('User not found');
  return toPublic(user, repo.getProfile(userId));
}

module.exports = { register, login, me };
