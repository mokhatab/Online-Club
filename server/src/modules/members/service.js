'use strict';

/** Layer: service (members). */
const repo = require('./repository');

function listMembers(query) {
  return repo.list(query);
}

function getStats() {
  return repo.stats();
}

module.exports = { listMembers, getStats };
