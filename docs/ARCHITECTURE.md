# Architecture

Online Club is a **layered monorepo**: a React web client talks to a versioned
Node.js/Express API; the API is organised in strict layers down to SQLite.

```
┌─────────────────────────────────────────────────────────────┐
│ client/  React + Vite + React Router (presentation layer)   │
│   pages/ → components/ → api/client.js  (ONE http module)   │
└──────────────────────────┬──────────────────────────────────┘
                           │  JSON over HTTP  (/api/v1/…)
┌──────────────────────────▼──────────────────────────────────┐
│ server/  Express API                                        │
│                                                             │
│  routes.js       URL map → middleware chain → controller    │
│       ↓                                                     │
│  controller.js   HTTP in/out + zod validation schemas      │
│       ↓                                                     │
│  service.js      business rules + cross-service calls       │
│       ↓ ↕ (event bus: services talk to each other)          │
│  repository.js   SQL only (prepare/get/all/run)             │
│       ↓                                                     │
│  db/connection.js  single SQLite connection (node:sqlite)   │
│                                                             │
│  integrations/marketing/  pluggable toolkits (Mailchimp,    │
│    Brevo, SendGrid, GA4, Meta CAPI, TikTok, generic URL)    │
└──────────────────────────┬──────────────────────────────────┘
                           │  outbound POST / Measurement APIs
┌──────────────────────────▼──────────────────────────────────┐
│ Marketing toolkits (and inbound webhooks back into the API) │
└─────────────────────────────────────────────────────────────┘
```

## How the APIs talk to each other

1. **Client → API**: `client/src/api/client.js` is the only HTTP module in the
   UI. Every page calls it; auth token attached automatically.
2. **Service → service (internal)**: domain services never import each
   other's repositories. They either
   - call a sibling **service function** directly (bookings → events for
     capacity/rules), or
   - **emit a domain event** on `src/core/eventBus.js`
     (`member.registered`, `booking.created`, `booking.cancelled`,
     `event.published`), which the marketing hub subscribes to in
     `src/services/subscriptions.js`.
3. **API → database**: only repositories touch SQL, through the single
   connection in `db/connection.js`. Multi-write flows use `transaction()`.
4. **API → marketing toolkits**: `modules/marketing/service.js` fans each
   internal event out to every **enabled** provider in
   `integrations/marketing/providers/`. Every attempt is logged to the
   `marketing_logs` table (visible in Admin → Marketing toolkits).
5. **Toolkits → API (inbound)**: each provider has a receiver URL
   `POST /api/v1/marketing/inbound/:provider` — paste it into the toolkit
   (e.g. Mailchimp/Zapier webhook step) so unsubscribes etc. sync back to
   member profiles.

## Adding a new marketing toolkit

1. Create `server/src/integrations/marketing/providers/<key>.js` exporting
   `{ key, name, description, events, fields, send(), test() }`
   (copy `webhook.js` — ~30 lines).
2. Require it in `server/src/integrations/marketing/index.js`.
3. Restart — it appears in the admin UI automatically, with config fields
   rendered from `fields` and secrets masked.

## Swapping the database

Repositories only use `getDb().prepare(...).get/all/run` + `transaction()`.
To move to Postgres: replace `db/connection.js` with a `pg` pool exposing
the same tiny interface and adjust the `?` placeholders — services,
controllers and routes stay untouched.
