'use strict';

/**
 * Layer: service (marketing) — the hub that talks to external marketing
 * toolkits AND to internal services:
 *
 *  OUTBOUND: internal events (member.registered, booking.created, …) → fan
 *  out to every ENABLED provider (Mailchimp, Brevo, GA4, Meta, TikTok,
 *  generic webhook URL…). Each attempt is logged to marketing_logs.
 *
 *  INBOUND: external toolkits call back into
 *  POST /api/v1/marketing/inbound/:provider  (e.g. "contact unsubscribed",
 *  "campaign click") → stored + applied to member profiles.
 *
 *  PUBLIC CONFIG: safe (secret-free) snippet settings for the web client
 *  so it can load GA4 / Meta Pixel / TikTok pixels automatically.
 */
const repo = require('./repository');
const membersRepository = require('../members/repository');
const authRepository = require('../auth/repository');
const { PROVIDERS, getProvider } = require('../../integrations/marketing');
const { HttpError } = require('../../core/errors');
const env = require('../../config/env');

const KNOWN_EVENTS = [
  'member.registered',
  'booking.created',
  'booking.cancelled',
  'event.published',
  'test.ping',
];

function maskSecrets(provider, config) {
  const secretFields = new Set(provider.fields.filter((f) => f.secret).map((f) => f.name));
  const masked = {};
  for (const [k, v] of Object.entries(config || {})) {
    masked[k] = secretFields.has(k) && v ? '••••••' : v;
  }
  return masked;
}

function mergeSecrets(provider, stored, incoming) {
  // Admin UI sends '••••••' for untouched secrets — keep the stored value.
  const secretFields = new Set(provider.fields.filter((f) => f.secret).map((f) => f.name));
  const merged = { ...(stored || {}) };
  for (const [k, v] of Object.entries(incoming || {})) {
    if (secretFields.has(k) && (v === '••••••' || v === '')) continue;
    merged[k] = v;
  }
  return merged;
}

function listIntegrations() {
  const stored = new Map(repo.listSettings().map((s) => [s.key, s]));
  return PROVIDERS.map((p) => {
    const s = stored.get(p.key) || { enabled: false, config: {} };
    return {
      key: p.key,
      name: p.name,
      description: p.description,
      direction: p.direction,
      events: p.events,
      fields: p.fields,
      enabled: s.enabled,
      config: maskSecrets(p, s.config),
      inbound_url: `${env.apiPublicUrl}/api/v1/marketing/inbound/${p.key}`,
    };
  });
}

function updateIntegration(key, { enabled, config }) {
  const provider = getProvider(key);
  if (!provider) throw HttpError.notFound(`Unknown integration: ${key}`);
  const stored = repo.getSetting(key);
  const merged = mergeSecrets(provider, stored.config, config);
  const saved = repo.saveSetting(key, {
    enabled: enabled ?? stored.enabled,
    config: merged,
  });
  return {
    key: provider.key,
    name: provider.name,
    enabled: saved.enabled,
    config: maskSecrets(provider, saved.config),
  };
}

/** Fan-out one internal event to every enabled provider that wants it. */
async function dispatch(event, payload) {
  const settings = new Map(repo.listSettings().map((s) => [s.key, s]));
  const results = [];
  for (const provider of PROVIDERS) {
    if (!provider.events.includes(event)) continue;
    const setting = settings.get(provider.key);
    if (!setting?.enabled) {
      results.push({ provider: provider.key, status: 'skipped', detail: 'disabled' });
      continue;
    }
    try {
      const res = await provider.send({ event, payload, config: setting.config });
      const status = res.ok ? 'sent' : 'failed';
      repo.logOutbound({ provider: provider.key, eventType: event, status, detail: res.detail });
      results.push({ provider: provider.key, status, detail: res.detail });
    } catch (err) {
      repo.logOutbound({ provider: provider.key, eventType: event, status: 'failed', detail: err.message });
      results.push({ provider: provider.key, status: 'failed', detail: err.message });
    }
  }
  return results;
}

/** "Send test" button: run the provider's own test with stored config. */
async function testIntegration(key) {
  const provider = getProvider(key);
  if (!provider) throw HttpError.notFound(`Unknown integration: ${key}`);
  const setting = repo.getSetting(key);
  const res = await provider.test({ config: setting.config });
  repo.logOutbound({ provider: key, eventType: 'test.ping', status: res.ok ? 'sent' : 'failed', detail: res.detail });
  return { provider: key, ok: res.ok, detail: res.detail };
}

/**
 * Inbound webhook from a marketing toolkit.
 * Supported generic payload: { email, action } where action is one of
 * subscribed | unsubscribed | bounced. Provider-specific payloads are stored
 * as-is and acknowledged.
 */
function handleInbound(providerKey, payload) {
  repo.storeInbound(providerKey, payload || {});
  const email = payload?.email || payload?.contact?.email || payload?.data?.email;
  const action = String(payload?.action || payload?.type || payload?.event || '').toLowerCase();
  if (email && ['unsubscribed', 'unsubscribe', 'bounced', 'complained', 'opt_out'].some((k) => action.includes(k))) {
    const user = authRepository.findByEmail(email);
    if (user) membersRepository.setNewsletterOptIn(user.id, false);
    return { received: true, applied: 'newsletter_opt_out', email };
  }
  if (email && ['subscribed', 'subscribe', 'opt_in'].some((k) => action.includes(k))) {
    const user = authRepository.findByEmail(email);
    if (user) membersRepository.setNewsletterOptIn(user.id, true);
    return { received: true, applied: 'newsletter_opt_in', email };
  }
  return { received: true, applied: 'stored', provider: providerKey };
}

/** Secret-free config the browser uses to load tracking snippets. */
function publicConfig() {
  const settings = new Map(repo.listSettings().map((s) => [s.key, s]));
  const pick = (key, fields) => {
    const s = settings.get(key);
    if (!s?.enabled) return null;
    const out = {};
    for (const f of fields) if (s.config[f]) out[f] = s.config[f];
    return Object.keys(out).length ? out : null;
  };
  return {
    ga4: pick('ga4', ['measurementId']),
    meta: pick('meta_capi', ['pixelId']),
    tiktok: pick('tiktok', ['pixelId']),
  };
}

function listLogs(limit) {
  return repo.listLogs({ limit });
}

function listInbound(limit) {
  return repo.listInbound({ limit });
}

module.exports = {
  KNOWN_EVENTS,
  listIntegrations,
  updateIntegration,
  dispatch,
  testIntegration,
  handleInbound,
  publicConfig,
  listLogs,
  listInbound,
};
