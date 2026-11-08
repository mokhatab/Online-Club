'use strict';

/**
 * Express wiring: global middlewares → versioned API routes → docs → errors.
 * Route modules are the outermost layer; they only map URLs to controllers.
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const env = require('./config/env');
const { requestLogger } = require('./middlewares/requestLogger');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/routes');
const membersRoutes = require('./modules/members/routes');
const eventsRoutes = require('./modules/events/routes');
const bookingsRoutes = require('./modules/bookings/routes');
const marketingRoutes = require('./modules/marketing/routes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.get('/', (_req, res) => res.json({
    name: 'Online Club API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/api/v1/health',
  }));

  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/members', membersRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/bookings', bookingsRoutes);
  app.use('/api/v1/marketing', marketingRoutes);

  // Interactive API docs (Swagger UI) generated from openapi.yaml.
  try {
    const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
    app.get('/api/openapi.yaml', (_req, res) => res.sendFile(path.join(__dirname, '../openapi.yaml')));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[app] Swagger docs disabled:', err.message);
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
