'use strict';

/** Brevo (ex-Sendinblue) — create/update contacts on registration & booking. */
const { postJson } = require('../http');

module.exports = {
  key: 'brevo',
  name: 'Brevo',
  description: 'Syncs members & bookers to your Brevo contacts / lists.',
  direction: 'outbound',
  events: ['member.registered', 'booking.created'],
  fields: [
    { name: 'apiKey', label: 'API key (v3)', type: 'password', required: true, secret: true },
    { name: 'listIds', label: 'List IDs (comma separated)', type: 'text', required: false, placeholder: '2, 5' },
  ],
  async send({ payload, config }) {
    const email = payload?.user?.email;
    if (!config.apiKey) return { ok: false, detail: 'Missing Brevo API key' };
    if (!email) return { ok: false, detail: 'No email in payload' };
    const listIds = String(config.listIds || '').split(',').map((s) => Number(s.trim())).filter(Boolean);
    const res = await postJson('https://api.brevo.com/v3/contacts', {
      headers: { 'api-key': config.apiKey },
      body: { email, attributes: { FIRSTNAME: payload.user.name || '' }, ...(listIds.length ? { listIds } : {}), updateEnabled: true },
    });
    return res.ok ? { ok: true, detail: `Synced ${email}` } : { ok: false, detail: `Brevo ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    if (!config.apiKey) return { ok: false, detail: 'Missing Brevo API key' };
    return { ok: true, detail: 'Config present (Brevo test is a dry-run)' };
  },
};
