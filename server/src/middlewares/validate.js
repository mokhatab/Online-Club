'use strict';

const { HttpError } = require('../core/errors');

/** Validate req.body / req.query / req.params against zod schemas. */
function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query);
      if (params) req.params = params.parse(req.params);
      return next();
    } catch (err) {
      const details = err.errors?.map((e) => `${e.path.join('.')}: ${e.message}`);
      return next(HttpError.badRequest('Validation failed', details));
    }
  };
}

module.exports = { validate };
