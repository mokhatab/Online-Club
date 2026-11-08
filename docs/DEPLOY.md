# Deploy guide

Start here: [`deploy/README.md`](../deploy/README.md) (Docker · systemd+nginx ·
PM2 · desktop). This page adds the details.

## What goes where

| Piece | Artifact | Serves |
|---|---|---|
| API | `server/` + `node_modules` | `:4000` → `/api/*`, `/api/docs` |
| Web | `client/dist` (from `npm run build`) | static files via nginx **or** via the API itself with `SERVE_CLIENT_DIR=../client/dist` |
| Data | SQLite file at `DATABASE_PATH` | back this file up nightly |

## Environment (production `.env`)

```bash
NODE_ENV=production
PORT=4000
API_PUBLIC_URL=https://your-domain.com   # inbound marketing URLs are built from this
CORS_ORIGINS=https://your-domain.com
DATABASE_PATH=/var/lib/online-club/online-club.db
JWT_SECRET=<long random string>
SEED_ON_BOOT=true                        # safe: seeds only an empty DB
```

Single-origin shortcut (API serves the client, one port, no nginx needed
for routing): `SERVE_CLIENT_DIR=/opt/online-club/client/dist`.

## Release & rollback

```bash
npm test --workspace server   # must pass
npm run release               # → release/online-club-vX.Y.Z.{zip,tar.gz}
```

Each release archive is a full deployable snapshot (source + tests + deploy
files). Roll back by redeploying the previous archive and restoring the DB
backup.

## Health & smoke checks after deploy

```bash
curl https://your-domain.com/api/v1/health
curl https://your-domain.com/api/v1/members/stats
# open https://your-domain.com/api/docs in a browser
```
