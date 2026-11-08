'use strict';

/** Layer: controller (marketing). */
const { z } = require('zod');
const service = require('./service');

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional().default({}),
});

const trackSchema = z.object({
  event: z.string().min(1).max(80),
  payload: z.record(z.string(), z.any()).optional().default({}),
});

function list(req, res, next) {
  try {
    res.json({ integrations: service.listIntegrations() });
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    res.json(service.updateIntegration(req.params.key, req.body));
  } catch (err) {
    next(err);
  }
}

async function test(req, res, next) {
  try {
    res.json(await service.testIntegration(req.params.key));
  } catch (err) {
    next(err);
  }
}

/** Client-side tracking relay + manual event trigger (admin). */
async function track(req, res, next) {
  try {
    const results = await service.dispatch(req.body.event, {
      ...req.body.payload,
      relayed_by: req.user ? { id: req.user.sub, email: req.user.email } : 'anonymous',
    });
    res.json({ event: req.body.event, results });
  } catch (err) {
    next(err);
  }
}

/** Inbound receiver URL for external marketing toolkits (no auth by design —
 *  providers can't log in; validate the payload + use per-provider secrets). */
function inbound(req, res, next) {
  try {
    res.json(service.handleInbound(req.params.provider, req.body));
  } catch (err) {
    next(err);
  }
}

function pubConfig(_req, res, next) {
  try {
    res.json(service.publicConfig());
  } catch (err) {
    next(err);
  }
}

function logs(req, res, next) {
  try {
    res.json({ logs: service.listLogs(Math.min(Number(req.query.limit) || 100, 500)) });
  } catch (err) {
    next(err);
  }
}

function inboundList(req, res, next) {
  try {
    res.json({ webhooks: service.listInbound(Math.min(Number(req.query.limit) || 50, 200)) });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, update, test, track, inbound, pubConfig, logs, inboundList, updateSchema, trackSchema };
