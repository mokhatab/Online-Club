'use strict';

/**
 * Layer: config — single place that reads & validates environment variables.
 * Every other layer imports from here instead of touching process.env.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
require('dotenv').config(); // also allow server/.env overrides

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  apiPublicUrl: (process.env.API_PUBLIC_URL || 'http://localhost:4000').replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databasePath: process.env.DATABASE_PATH || './data/online-club.db',
  jwtSecret: process.env.JWT_SECRET || 'change-me-to-a-long-random-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  seedOnBoot: String(process.env.SEED_ON_BOOT || 'true').toLowerCase() !== 'false',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@onlineclub.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
  // When set, the API also serves the built web client (single-origin mode
  // used by the desktop app and simple one-process deploys).
  serveClientDir: process.env.SERVE_CLIENT_DIR || '',
};

if (env.nodeEnv === 'production' && env.jwtSecret.includes('change-me')) {
  // eslint-disable-next-line no-console
  console.warn('[config] WARNING: JWT_SECRET is still the default value. Set a strong secret!');
}

module.exports = env;
