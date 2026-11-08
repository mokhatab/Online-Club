'use strict';

/** Google Analytics 4 — server-side events via Measurement Protocol. */
const { postJson } = require('../http');

module.exports = {
  key: 'ga4',
  name: 'Google Analytics 4 (server events)',
  description: 'Sends bookings & signups to GA4 via Measurement Protocol. (For page views, paste the Measurement ID below and the web client loads gtag automatically.)',
  direction: 'outbound',
  events: ['member.registered', 'booking.created', 'booking.cancelled'],
  fields: [
    { name: 'measurementId', label: 'Measurement ID (G-XXXX)', type: 'text', required: true, public: true },
    { name: 'apiSecret', label: 'Measurement Protocol API secret', type: 'password', required: true, secret: true },
  ],
  async send({ event, payload, config }) {
    if (!config.measurementId || !config.apiSecret) return { ok: false, detail: 'Incomplete GA4 config' };
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;
    const res = await postJson(url, {
      body: {
        client_id: `club-${payload?.user?.id || 'anon'}-${Date.now()}`,
        events: [{ name: event.replace(/\./g, '_'), params: { event_label: payload?.event?.title || '' } }],
      },
    });
    // GA4 MP returns 2xx with empty body even for invalid payloads; treat transport success as ok.
    return res.ok ? { ok: true, detail: `GA4 event ${event}` } : { ok: false, detail: `GA4 ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    if (!config.measurementId) return { ok: false, detail: 'Missing Measurement ID' };
    return { ok: true, detail: 'Config present (GA4 test is a dry-run)' };
  },
};
