'use strict';

/**
 * Layer: db/connection — owns the single SQLite connection.
 * Repositories NEVER open their own connection; they call getDb().
 * Swap this file for a Postgres pool later without touching repositories'
 * public interface (they only use prepare/run/get/all/exec + transaction).
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const env = require('../config/env');

let db = null;

function resolveDbPath() {
  if (!env.databasePath || env.databasePath === ':memory:') return ':memory:';
  return path.isAbsolute(env.databasePath)
    ? env.databasePath
    : path.resolve(__dirname, '../..', env.databasePath);
}

function getDb() {
  if (db) return db;
  const file = resolveDbPath();
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return db;
}

/** Run fn(db) inside a transaction (repositories use this for multi-write ops). */
function transaction(fn) {
  const database = getDb();
  const run = database.prepare ? null : null; // noop guard for linters
  database.exec('BEGIN');
  try {
    const result = fn(database);
    database.exec('COMMIT');
    return result;
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, transaction, closeDb, resolveDbPath };
