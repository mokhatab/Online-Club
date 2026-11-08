'use strict';

/**
 * Service-to-service wiring: subscribes the marketing hub to domain events.
 * Add more cross-service reactions here (e.g. notifications, analytics).
 */
const { on } = require('../core/eventBus');
const marketingService = require('../modules/marketing/service');

function registerSubscriptions() {
  for (const event of marketingService.KNOWN_EVENTS) {
    if (event === 'test.ping') continue;
    on(event, (payload) => marketingService.dispatch(event, payload));
  }
  // eslint-disable-next-line no-console
  console.log('[services] marketing subscriptions registered');
}

module.exports = { registerSubscriptions };
