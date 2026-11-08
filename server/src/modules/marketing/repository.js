'use strict';

/** Layer: repository (marketing) — integration settings, logs, inbound store. */
const { getDb } = require('../../db/connection');

function getSetting(key) {
  const row = getDb().prepare('SELECT * FROM integration_settings WHERE key = ?').get(key);
  if (!row) return { key, enabled: false, config: {} };
  return { key: row.key, enabled: !!row.enabled, config: JSON.parse(row.config_json || '{}') };
}

function listSettings() {
  return getDb().prepare('SELECT * FROM integration_settings').all().map((row) => ({
    key: row.key,
    enabled: !!row.enabled,
    config: JSON.parse(row.config_json || '{}'),
    updated_at: row.updated_at,
  }));
}

function saveSetting(key, { enabled, config }) {
  getDb()
    .prepare(`INSERT INTO integration_settings (key, enabled, config_json, updated_at)
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled,
                config_json = excluded.config_json, updated_at = datetime('now')`)
    .run(key, enabled ? 1 : 0, JSON.stringify(config || {}));
  return getSetting(key);
}

function logOutbound({ provider, eventType, status, detail }) {
  getDb()
    .prepare('INSERT INTO marketing_logs (provider, event_type, status, detail) VALUES (?, ?, ?, ?)')
    .run(provider, eventType, status, detail ? String(detail).slice(0, 1000) : null);
}

function listLogs({ limit = 100 } = {}) {
  return getDb()
    .prepare('SELECT * FROM marketing_logs ORDER BY id DESC LIMIT ?')
    .all(limit);
}

function storeInbound(provider, payload) {
  getDb()
    .prepare('INSERT INTO inbound_webhooks (provider, payload_json) VALUES (?, ?)')
    .run(provider, JSON.stringify(payload ?? {}));
}

function listInbound({ limit = 50 } = {}) {
  return getDb()
    .prepare('SELECT * FROM inbound_webhooks ORDER BY id DESC LIMIT ?')
    .all(limit);
}

module.exports = { getSetting, listSettings, saveSetting, logOutbound, listLogs, storeInbound, listInbound };
