'use strict';

/** TikTok Events API — server events for the TikTok Pixel. */
const { postJson } = require('../http');

module.exports = {
  key: 'tiktok',
  name: 'TikTok Events API',
  description: 'Sends server-side events to TikTok. (Paste the Pixel ID and the web client loads the browser pixel automatically.)',
  direction: 'outbound',
  events: ['member.registered', 'booking.created'],
  fields: [
    { name: 'pixelId', label: 'Pixel ID', type: 'text', required: true, public: true },
    { name: 'accessToken', label: 'Events API access token', type: 'password', required: true, secret: true },
  ],
  async send({ event, payload, config }) {
    if (!config.pixelId || !config.accessToken) return { ok: false, detail: 'Incomplete TikTok config' };
    const map = { 'member.registered': 'CompleteRegistration', 'booking.created': 'PlaceAnOrder' };
    const res = await postJson('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      headers: { 'Access-Token': config.accessToken },
      body: {
        event_source: 'web',
        event_source_id: config.pixelId,
        data: [{
          event: map[event] || 'CustomEvent',
          event_time: Math.floor(Date.now() / 1000),
          user: { email: payload?.user?.email ? Buffer.from(String(payload.user.email).trim().toLowerCase()).toString('base64') : undefined },
          properties: { content_name: payload?.event?.title },
        }],
      },
    });
    return res.ok ? { ok: true, detail: `TikTok event ${map[event] || event}` } : { ok: false, detail: `TikTok ${res.status}: ${res.body}` };
  },
  async test({ config }) {
    if (!config.pixelId || !config.accessToken) return { ok: false, detail: 'Incomplete TikTok config' };
    return { ok: true, detail: 'Config present (TikTok test is a dry-run)' };
  },
};
