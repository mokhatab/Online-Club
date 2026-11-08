'use strict';

/**
 * Marketing provider registry — add a new toolkit by dropping one file in
 * ./providers and requiring it here. Nothing else changes (Open/Closed).
 */
const webhook = require('./providers/webhook');
const mailchimp = require('./providers/mailchimp');
const brevo = require('./providers/brevo');
const sendgrid = require('./providers/sendgrid');
const ga4 = require('./providers/ga4');
const metaCapi = require('./providers/metaCapi');
const tiktok = require('./providers/tiktok');

const PROVIDERS = [webhook, mailchimp, brevo, sendgrid, ga4, metaCapi, tiktok];
const PROVIDER_KEYS = PROVIDERS.map((p) => p.key);

function getProvider(key) {
  return PROVIDERS.find((p) => p.key === key) || null;
}

module.exports = { PROVIDERS, PROVIDER_KEYS, getProvider };
