'use strict';

const { verifyToken } = require('../utils/jwt');
const { HttpError } = require('../core/errors');

/** Attach req.user when a valid Bearer token is present, else 401. */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return next(HttpError.unauthorized());
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return next(HttpError.unauthorized('Invalid or expired token'));
  }
}

/** Like requireAuth, but lets anonymous requests through with req.user = null. */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  req.user = null;
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.user) return next(HttpError.unauthorized());
  if (req.user.role !== 'admin') return next(HttpError.forbidden('Admin only'));
  return next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
