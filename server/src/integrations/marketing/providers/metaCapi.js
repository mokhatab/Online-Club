'use strict';

/** Meta Conversions API — server events for the Meta Pixel. */
const crypto = require('crypto');
const { postJson } = require('../http');

const hash = (v) => (v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined);

module.exports = {
  key: 'meta_capi',
  name: 'Meta Conversions API',
  description: 'Sends server-side events (signups, bookings) to Meta. (Paste the Pixel ID and the web client loads the browser pixel automatically.)',
  direction: 'outbound',
  events: ['member.registered', 'booking.created'],
  fields: [
    { name: 'pixelId', label: 'Pixel ID', type: 'text', required: true, public: true },
    { name: 'accessToken', label: 'Conversions API access token', type: 'password', required: true, secret: true },
  ],
  async send({ event, payload, config }) {
    if (!config.pixelId || !config.accessToken) return { ok: false, detail: 'Incomplete Meta config' };
    const map = { 'member.registered': 'CompleteRegistration', 'booking.created': 'Purchase' };
    const res = await postJson(
      `https://graph.facebook.com/v20.0/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`,
      {
        body: {
          data: [{
            event_name: map[event] || 'CustomEvent',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: { em: hash(payload?.user?.email) },
            custom_data: { event_title: payload?.event?.title, value: (payload?.event?.price_cents || 0) / 100, currency: payload?.event?.currency || 'USD' },
          }],
        },
      }
    );
    return res.ok ? { ok: true, detail: `Meta event ${map[event] || event}` } : { ok: false, detail: `Meta ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    if (!config.pixelId || !config.accessToken) return { ok: false, detail: 'Incomplete Meta config' };
    return { ok: true, detail: 'Config present (Meta test is a dry-run)' };
  },
};
