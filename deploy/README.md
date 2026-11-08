# Deploying Online Club

Four supported ways, easiest first.

## 1. Docker (any VPS, 5 minutes)

```bash
unzip online-club-v*.zip && cd online-club-*
cp .env.example .env        # set JWT_SECRET + API_PUBLIC_URL=https://your-domain.com
docker compose up -d --build
```

- Web: `http://server:5173` · API: `http://server:4000` (put nginx/Caddy in
  front for HTTPS — see `nginx.conf.example`).

## 2. systemd + nginx (Ubuntu/Debian VPS)

```bash
sudo apt install -y nodejs npm nginx
sudo mkdir -p /opt/online-club /var/lib/online-club
sudo chown -R $USER /opt/online-club /var/lib/online-club
unzip online-club-v*.zip -d /opt/online-club   # or git clone
cd /opt/online-club
cp .env.example .env && nano .env              # JWT_SECRET, API_PUBLIC_URL, DATABASE_PATH=/var/lib/online-club/online-club.db
./install.sh && npm run build
sudo cp deploy/online-club-api.service /etc/systemd/system/
sudo systemctl enable --now online-club-api
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/online-club
# edit server_name, then:
sudo ln -s /etc/nginx/sites-available/online-club /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com       # HTTPS (optional)
```

## 3. PM2 (Linux/macOS/Windows server)

```bash
npm i -g pm2
./install.sh && npm run build
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
```

Serve `client/dist` with nginx/IIS, or single-origin mode:

```bash
# API serves the web client itself on one port:
SERVE_CLIENT_DIR=../client/dist PORT=4000 node server/src/index.js
```

## 4. Desktop app (Windows/macOS/Linux, offline)

```bash
npm run install:all && npm run install:desktop && npm run build
npm run desktop            # run it now
npm run desktop:dist       # build installers for your OS (see docs/DESKTOP.md)
```

## Production checklist

- [ ] `JWT_SECRET` = long random string, `NODE_ENV=production`
- [ ] `API_PUBLIC_URL=https://your-domain.com` (so inbound marketing URLs are correct)
- [ ] Change the seeded admin password after first login
- [ ] `CORS_ORIGINS` = your web origin(s)
- [ ] Back up the SQLite file (`DATABASE_PATH`) nightly
- [ ] `npm test --workspace server` passes before each deploy
