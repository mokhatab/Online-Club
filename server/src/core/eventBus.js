'use strict';

/**
 * Core: in-process event bus — this is how the internal APIs (services)
 * talk to each other without tight coupling:
 *
 *   bookings service  ──emit──>  'booking.created'  ──>  marketing service
 *   auth service      ──emit──>  'member.registered' ──> marketing service
 *
 * Subscribers are registered in src/services/subscriptions.js at boot.
 */
const listeners = new Map();

function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(handler);
}

async function emit(event, payload) {
  const handlers = listeners.get(event) || [];
  // Run sequentially so logs stay ordered; a failing subscriber never
  // breaks the HTTP request that emitted the event.
  for (const handler of handlers) {
    try {
      await handler(payload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[eventBus] handler for ${event} failed:`, err.message);
    }
  }
}

module.exports = { on, emit };
