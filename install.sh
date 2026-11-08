#!/usr/bin/env bash
# Online Club — one-shot installer (Linux / macOS / WSL / Git Bash)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Online Club installer"
echo "==> Node: $(node --version) | npm: $(npm --version)"

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
else
  echo "==> .env already exists (keeping it)"
fi

echo "==> Installing dependencies (root + server + client)…"
npm run install:all

echo "==> Migrating database…"
npm run migrate --workspace server

echo "==> Seeding demo data…"
npm run seed --workspace server

echo ""
echo "Done! Start everything with:"
echo "  npm run dev"
echo ""
echo "  API:      http://localhost:4000/api/v1/health"
echo "  API docs: http://localhost:4000/api/docs"
echo "  Web app:  http://localhost:5173"
echo "  Admin:    admin@onlineclub.local / Admin123!"
