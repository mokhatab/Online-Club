'use strict';

/** SendGrid — upsert contacts into Marketing lists. */
const { putJson } = require('../http');

module.exports = {
  key: 'sendgrid',
  name: 'SendGrid',
  description: 'Upserts members into SendGrid Marketing contacts.',
  direction: 'outbound',
  events: ['member.registered'],
  fields: [
    { name: 'apiKey', label: 'API key', type: 'password', required: true, secret: true },
    { name: 'listIds', label: 'List IDs (comma separated)', type: 'text', required: false },
  ],
  async send({ payload, config }) {
    const email = payload?.user?.email;
    if (!config.apiKey) return { ok: false, detail: 'Missing SendGrid API key' };
    if (!email) return { ok: false, detail: 'No email in payload' };
    const listIds = String(config.listIds || '').split(',').map((s) => s.trim()).filter(Boolean);
    const res = await putJson('https://api.sendgrid.com/v3/marketing/contacts', {
      headers: { authorization: `Bearer ${config.apiKey}` },
      body: {
        ...(listIds.length ? { list_ids: listIds } : {}),
        contacts: [{ email, first_name: payload.user.name || '' }],
      },
    });
    return res.ok ? { ok: true, detail: `Upserted ${email}` } : { ok: false, detail: `SendGrid ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    if (!config.apiKey) return { ok: false, detail: 'Missing SendGrid API key' };
    return { ok: true, detail: 'Config present (SendGrid test is a dry-run)' };
  },
};
