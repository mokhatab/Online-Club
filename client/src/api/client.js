/**
 * API client — the ONLY place the UI talks HTTP. All pages import from here.
 * Base URL defaults to the same-origin /api/v1 (Vite proxy in dev, so the
 * browser never needs to know the API host). Override with VITE_API_URL.
 */
const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

const TOKEN_KEY = 'club_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = json.details;
    throw err;
  }
  return json;
}

const authHeader = () => ({ token: tokenStore.get() });

export const api = {
  // auth
  register: (data) => request('POST', '/auth/register', { body: data }),
  login: (data) => request('POST', '/auth/login', { body: data }),
  me: () => request('GET', '/auth/me', authHeader()),
  // members
  stats: () => request('GET', '/members/stats'),
  members: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/members${q ? `?${q}` : ''}`, authHeader());
  },
  // events
  events: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/events${q ? `?${q}` : ''}`);
  },
  eventCategories: () => request('GET', '/events/categories'),
  event: (slug) => request('GET', `/events/${encodeURIComponent(slug)}`),
  createEvent: (data) => request('POST', '/events', { ...authHeader(), body: data }),
  updateEvent: (id, data) => request('PATCH', `/events/${id}`, { ...authHeader(), body: data }),
  deleteEvent: (id) => request('DELETE', `/events/${id}`, authHeader()),
  // bookings
  book: (event_id, seats = 1) => request('POST', '/bookings', { ...authHeader(), body: { event_id, seats } }),
  myBookings: () => request('GET', '/bookings/mine', authHeader()),
  eventBookings: (eventId) => request('GET', `/bookings/event/${eventId}`, authHeader()),
  cancelBooking: (id) => request('POST', `/bookings/${id}/cancel`, authHeader()),
  // marketing
  marketingPublic: () => request('GET', '/marketing/public-config'),
  marketingTrack: (event, payload = {}) => request('POST', '/marketing/track', { ...authHeader(), body: { event, payload } }),
  integrations: () => request('GET', '/marketing/integrations', authHeader()),
  updateIntegration: (key, data) => request('PUT', `/marketing/integrations/${key}`, { ...authHeader(), body: data }),
  testIntegration: (key) => request('POST', `/marketing/integrations/${key}/test`, authHeader()),
  marketingLogs: () => request('GET', '/marketing/logs', authHeader()),
  inboundWebhooks: () => request('GET', '/marketing/inbound', authHeader()),
};

export { API_BASE };
