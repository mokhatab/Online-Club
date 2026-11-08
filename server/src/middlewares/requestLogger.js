'use strict';

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    // eslint-disable-next-line no-console
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
}

module.exports = { requestLogger };
