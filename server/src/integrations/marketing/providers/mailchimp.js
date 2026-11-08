'use strict';

/** Mailchimp — subscribe members to an audience (list) on registration. */
const { requestJson } = require('../http');

module.exports = {
  key: 'mailchimp',
  name: 'Mailchimp',
  description: 'Adds new members to your Mailchimp audience automatically.',
  direction: 'outbound',
  events: ['member.registered'],
  fields: [
    { name: 'apiKey', label: 'API key', type: 'password', required: true, secret: true },
    { name: 'serverPrefix', label: 'Server prefix (e.g. us21)', type: 'text', required: true, placeholder: 'us21' },
    { name: 'audienceId', label: 'Audience / List ID', type: 'text', required: true },
  ],
  async send({ payload, config }) {
    const { apiKey, serverPrefix, audienceId } = config;
    if (!apiKey || !serverPrefix || !audienceId) return { ok: false, detail: 'Incomplete Mailchimp config' };
    const email = payload?.user?.email;
    if (!email) return { ok: false, detail: 'No email in payload' };
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;
    const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');
    const res = await requestJson(url, {
      method: 'PUT',
      headers: { authorization: `Basic ${auth}` },
      body: { email_address: email, status: 'subscribed', merge_fields: { FNAME: payload.user.name || '' } },
    });
    return res.ok ? { ok: true, detail: `Subscribed ${email}` } : { ok: false, detail: `Mailchimp ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    const { apiKey, serverPrefix } = config;
    if (!apiKey || !serverPrefix) return { ok: false, detail: 'Incomplete Mailchimp config' };
    const res = await requestJson(`https://${serverPrefix}.api.mailchimp.com/3.0/ping`, {
      method: 'GET',
      headers: { authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}` },
    });
    return res.ok ? { ok: true, detail: 'Mailchimp API reachable' } : { ok: false, detail: `Mailchimp ${res.status}: ${res.body}` };
  },
};
