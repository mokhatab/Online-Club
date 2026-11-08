'use strict';

/**
 * Shared outbound HTTP helper for marketing providers.
 * Short timeout + never throws on HTTP error status (returns {ok:false}).
 */
async function postJson(url, { headers = {}, body, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, body: String(err.message || err).slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

async function putJson(url, opts = {}) {
  return requestJson(url, { ...opts, method: 'PUT' });
}

async function requestJson(url, { method = 'POST', headers = {}, body, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, body: String(err.message || err).slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { postJson, putJson, requestJson };
