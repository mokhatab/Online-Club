# API reference

Base URL: `http://localhost:4000/api/v1` · Interactive docs: `http://localhost:4000/api/docs`

Auth: `Authorization: Bearer <token>` (from `POST /auth/login` or `/auth/register`).

## Quick tour (curl)

```bash
# health
curl localhost:4000/api/v1/health

# register (emits member.registered → enabled marketing toolkits)
curl -X POST localhost:4000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Sara","email":"sara@example.com","password":"Secret123!","city":"Suez"}'

# login
TOKEN=$(curl -s -X POST localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@onlineclub.local","password":"Admin123!"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# list events
curl 'localhost:4000/api/v1/events?limit=5'

# create event (admin) — emits event.published
curl -X POST localhost:4000/api/v1/events \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Beach Yoga","starts_at":"2026-12-01T07:00:00.000Z","capacity":30}'

# book a seat — emits booking.created
curl -X POST localhost:4000/api/v1/bookings \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"event_id":1,"seats":2}'

# connect a marketing toolkit (admin): generic webhook URL
curl -X PUT localhost:4000/api/v1/marketing/integrations/webhook \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"enabled":true,"config":{"url":"https://hooks.zapier.com/hooks/catch/xxx"}}'

# test it
curl -X POST localhost:4000/api/v1/marketing/integrations/webhook/test \
  -H "authorization: Bearer $TOKEN"

# delivery log
curl localhost:4000/api/v1/marketing/logs -H "authorization: Bearer $TOKEN"

# inbound: a toolkit reports an unsubscribe (no auth — paste this URL into the toolkit)
curl -X POST localhost:4000/api/v1/marketing/inbound/mailchimp \
  -H 'content-type: application/json' \
  -d '{"email":"sara@example.com","action":"unsubscribed"}'
```

## Endpoint map

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | Health check |
| POST | `/auth/register` | – | Register member |
| POST | `/auth/login` | – | Log in |
| GET | `/auth/me` | user | Current user |
| GET | `/members/stats` | – | Public counters |
| GET | `/members` | admin | List/search members |
| GET | `/events` | – | List events (`status, category, upcomingOnly, limit, offset`) |
| GET | `/events/categories` | – | Categories |
| GET | `/events/:slug` | – | One event + availability |
| POST | `/events` | admin | Create event |
| PATCH | `/events/:id` | admin | Update event |
| DELETE | `/events/:id` | admin | Delete event |
| POST | `/bookings` | user | Book seats |
| GET | `/bookings/mine` | user | My bookings |
| GET | `/bookings/event/:eventId` | admin | Event bookings |
| POST | `/bookings/:id/cancel` | user | Cancel (promotes waitlist) |
| GET | `/marketing/public-config` | – | Browser snippet IDs |
| POST | `/marketing/track` | – | Relay tracking event |
| POST | `/marketing/inbound/:provider` | – | Toolkit callback URL |
| GET | `/marketing/integrations` | admin | List integrations |
| PUT | `/marketing/integrations/:key` | admin | Configure integration |
| POST | `/marketing/integrations/:key/test` | admin | Send test |
| GET | `/marketing/logs` | admin | Delivery log |
| GET | `/marketing/inbound` | admin | Received webhooks |

Full schemas: [`server/openapi.yaml`](../server/openapi.yaml) or `/api/docs` in the browser.
