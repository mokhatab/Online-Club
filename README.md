# Online Club 🎪

A **social / community club** web application focused on **events & bookings**,
built as a clean **layered stack** with internal APIs that talk to each other
and to the database — plus **URL-based connections to marketing toolkits**
(Mailchimp, Brevo, SendGrid, GA4, Meta, TikTok, or any tool via webhook URL).

- **Web client** — React + Vite + React Router (`client/`)
- **API** — Node.js + Express, layered `routes → controllers → services → repositories → SQLite` (`server/`)
- **Database** — SQLite via built-in `node:sqlite` (zero native deps; file created automatically)
- **Docs** — Swagger UI at `/api/docs` + [`docs/`](docs/)

## 1-minute install

Requirements: **Node.js ≥ 22.5** and npm.

```bash
git clone <this-repo> && cd Online-Club
./install.sh          # or: npm run install:all && npm run migrate --workspace server && npm run seed --workspace server
npm run dev
```

| What | Where |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:4000/api/v1/health |
| API docs (Swagger) | http://localhost:4000/api/docs |
| Admin login | `admin@onlineclub.local` / `Admin123!` |

Run API and web separately if you prefer:

```bash
npm run dev:server   # API on :4000 (auto-migrates + seeds on first boot)
npm run dev:client   # web on :5173 (proxies /api → :4000)
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## How the layers talk

```
Browser ──JSON/HTTP──▶ Express routes ─▶ controllers ─▶ services
                                                        │  ▲
                              event bus (member.registered, booking.created…)
                                                        │  │
                                    repositories ─▶ SQLite│  └─ marketing hub ─▶ Mailchimp/Brevo/GA4/Meta/TikTok/webhook URL
```

- Booking a seat calls **bookings service → events service** (capacity check)
  inside a DB transaction, then emits `booking.created` for the **marketing
  service**, which fans out to every enabled toolkit. See
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Every toolkit also gets an **inbound URL** so it can call back
  (e.g. sync unsubscribes). See [`docs/MARKETING.md`](docs/MARKETING.md).

## Project layout

```
server/src/
  index.js  app.js            boot + Express wiring
  config/                     env (single source of truth)
  db/                         connection, migrations, seed
  core/                       HttpError, eventBus (service-to-service)
  middlewares/                auth (JWT), zod validation, errors, logging
  modules/{auth,members,events,bookings,marketing}/
    routes.js controller.js service.js repository.js
  services/subscriptions.js   wires domain events → marketing hub
  integrations/marketing/     providers/ (one file per toolkit) + registry
client/src/
  api/client.js               the ONLY http module the UI uses
  pages/  components/  context/
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | API + web together |
| `npm test --workspace server` | API smoke tests (isolated temp DB) |
| `npm run build` | Production build of the web client |
| `npm run migrate/seed --workspace server` | DB migrate / demo data |

## Configuration

Copy `.env.example` → `.env`. Key vars: `PORT`, `CORS_ORIGINS`,
`DATABASE_PATH`, `JWT_SECRET`, `API_PUBLIC_URL` (used to print the inbound
webhook URLs — set it to your public domain in production, e.g. behind
ngrok/Cloudflare for toolkit callbacks).
