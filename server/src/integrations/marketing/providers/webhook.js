'use strict';

/**
 * Generic outbound webhook — connects Online Club to ANY marketing toolkit
 * (Zapier, Make, n8n, HubSpot workflows…) via a URL you paste in the admin UI.
 */
const { postJson } = require('../http');

module.exports = {
  key: 'webhook',
  name: 'Generic Webhook (Zapier / Make / n8n / any URL)',
  description: 'POSTs every marketing event as JSON to any URL you configure.',
  direction: 'outbound',
  events: ['member.registered', 'booking.created', 'booking.cancelled', 'event.published'],
  fields: [
    { name: 'url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://hooks.zapier.com/…' },
    { name: 'secret', label: 'Signing secret (optional)', type: 'password', required: false, secret: true },
  ],
  async send({ event, payload, config }) {
    if (!config.url) return { ok: false, detail: 'Missing webhook URL' };
    const res = await postJson(config.url, {
      headers: config.secret ? { 'x-club-signature': config.secret } : {},
      body: { event, sent_at: new Date().toISOString(), data: payload },
    });
    return res.ok
      ? { ok: true, detail: `POST ${config.url} -> ${res.status}` }
      : { ok: false, detail: `POST ${config.url} -> ${res.status} ${res.body}` };
  },
  async test({ config }) {
    return this.send({ event: 'test.ping', payload: { hello: 'online-club' }, config });
  },
};
