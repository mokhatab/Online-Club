'use strict';

/**
 * Smoke tests (node:test, zero extra deps): boot the layered API against an
 * isolated temp database and exercise auth → events → bookings → marketing.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it, before, after } = require('node:test');

const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'club-test-')), 'test.db');
process.env.DATABASE_PATH = tmpDb;
process.env.SEED_ON_BOOT = 'false';
process.env.JWT_SECRET = 'test-secret';

const { migrate } = require('../src/db/migrate');
const { registerSubscriptions } = require('../src/services/subscriptions');
const { createApp } = require('../src/app');
const { closeDb } = require('../src/db/connection');

let server;
let base;
let adminToken;
let memberToken;
let eventId;
let eventSlug;

before(async () => {
  migrate();
  registerSubscriptions();
  const app = createApp();
  server = app.listen(0);
  await new Promise((r) => server.on('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  server.close();
  closeDb();
  fs.rmSync(path.dirname(tmpDb), { recursive: true, force: true });
});

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe('Online Club API smoke', () => {
  it('health check', async () => {
    const { status, json } = await api('GET', '/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.status, 'ok');
  });

  it('registers admin + member and logs in', async () => {
    const admin = await api('POST', '/auth/register', {
      body: { name: 'Admin', email: 'admin@test.local', password: 'Admin123!' },
    });
    assert.strictEqual(admin.status, 201);
    // promote to admin directly (role can only be set internally)
    const { getDb } = require('../src/db/connection');
    getDb().prepare("UPDATE users SET role = 'admin' WHERE email = 'admin@test.local'").run();

    const login = await api('POST', '/auth/login', {
      body: { email: 'admin@test.local', password: 'Admin123!' },
    });
    assert.strictEqual(login.status, 200);
    adminToken = login.json.token;
    assert.ok(adminToken);

    const member = await api('POST', '/auth/register', {
      body: { name: 'Member', email: 'member@test.local', password: 'Member123!', city: 'Suez' },
    });
    assert.strictEqual(member.status, 201);
    memberToken = member.json.token;
  });

  it('rejects duplicate registration', async () => {
    const { status } = await api('POST', '/auth/register', {
      body: { name: 'Dup', email: 'member@test.local', password: 'Member123!' },
    });
    assert.strictEqual(status, 409);
  });

  it('admin creates an event, public can list it', async () => {
    const starts = new Date(Date.now() + 7 * 86400000).toISOString();
    const created = await api('POST', '/events', {
      token: adminToken,
      body: { title: 'Test Meetup', starts_at: starts, capacity: 2, location: 'Hall' },
    });
    assert.strictEqual(created.status, 201);
    eventId = created.json.id;
    eventSlug = created.json.slug;

    const list = await api('GET', '/events');
    assert.strictEqual(list.status, 200);
    assert.ok(list.json.rows.some((e) => e.id === eventId));

    const one = await api('GET', `/events/${eventSlug}`);
    assert.strictEqual(one.status, 200);
    assert.strictEqual(one.json.seats_left, 2);
  });

  it('member books, second member waitlists when full', async () => {
    const b1 = await api('POST', '/bookings', { token: memberToken, body: { event_id: eventId, seats: 2 } });
    assert.strictEqual(b1.status, 201);
    assert.strictEqual(b1.json.status, 'confirmed');

    const m2 = await api('POST', '/auth/register', {
      body: { name: 'Member Two', email: 'member2@test.local', password: 'Member123!' },
    });
    const b2 = await api('POST', '/bookings', { token: m2.json.token, body: { event_id: eventId } });
    assert.strictEqual(b2.status, 201);
    assert.strictEqual(b2.json.status, 'waitlisted');

    const cancel = await api('POST', `/bookings/${b1.json.id}/cancel`, { token: memberToken });
    assert.strictEqual(cancel.status, 200);
    assert.ok(cancel.json.promoted_booking_id, 'waitlisted booking should be promoted');
  });

  it('marketing: integrations, track relay, inbound receiver, logs', async () => {
    const integrations = await api('GET', '/marketing/integrations', { token: adminToken });
    assert.strictEqual(integrations.status, 200);
    assert.ok(integrations.json.integrations.length >= 7);
    assert.ok(integrations.json.integrations[0].inbound_url.includes('/inbound/'));

    const track = await api('POST', '/marketing/track', {
      token: memberToken,
      body: { event: 'booking.created', payload: { hello: 'world' } },
    });
    assert.strictEqual(track.status, 200);

    // inbound: external toolkit reports an unsubscribe → profile updated
    const inbound = await api('POST', '/marketing/inbound/mailchimp', {
      body: { email: 'member@test.local', action: 'unsubscribed' },
    });
    assert.strictEqual(inbound.json.applied, 'newsletter_opt_out');

    const me = await api('GET', '/auth/me', { token: memberToken });
    assert.strictEqual(me.json.user.profile.newsletter_opt_in, false);

    const pub = await api('GET', '/marketing/public-config');
    assert.strictEqual(pub.status, 200);
    assert.ok('ga4' in pub.json);

    const logs = await api('GET', '/marketing/logs', { token: adminToken });
    assert.strictEqual(logs.status, 200);
    assert.ok(Array.isArray(logs.json.logs));
  });

  it('guards admin routes', async () => {
    const { status } = await api('GET', '/members', { token: memberToken });
    assert.strictEqual(status, 403);
  });
});
