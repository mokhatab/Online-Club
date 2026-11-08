'use strict';

/**
 * Boot: migrate → (optionally) seed → register service subscriptions → listen.
 */
const env = require('./config/env');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');
const { registerSubscriptions } = require('./services/subscriptions');
const { createApp } = require('./app');

async function main() {
  migrate();
  if (env.seedOnBoot) {
    try {
      await seed();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[boot] seed failed:', err.message);
    }
  }
  registerSubscriptions();
  const app = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`[boot] Online Club API on http://localhost:${env.port} (docs: /api/docs)`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[boot] fatal:', err);
  process.exit(1);
});
