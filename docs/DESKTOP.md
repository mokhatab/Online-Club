# Desktop app (Windows / macOS / Linux)

`desktop/` is an **Electron shell** that runs the real product locally with
zero setup: the same Express API layers + SQLite database boot in-process and
serve the built React client in one window. Works fully **offline**.

```
desktop window ──▶ http://127.0.0.1:<random free port>/
                     ├─ /            React client (single-origin)
                     ├─ /api/v1/…    Express API (routes→controllers→services→repos)
                     ├─ /api/docs    Swagger UI
                     └─ database     <userData>/online-club.db (auto-created + seeded)
```

Default desktop login: `admin@onlineclub.local` / `Admin123!`
(change it after first launch).

## Run it now (from source)

Requirements: Node.js ≥ 22.5.

```bash
npm run install:all        # api + web deps
npm run install:desktop    # electron + builder (one time)
npm run build              # web client → client/dist (single-origin build)
npm run desktop            # opens the Online Club window
```

## Build installers

On the machine for each target OS (or CI):

```bash
npm run install:all && npm run install:desktop && npm run build
npm run desktop:dist       # installers for the CURRENT os
# or explicitly:
npm run dist:win --prefix desktop     # → desktop/dist/*.exe (NSIS + portable)
npm run dist:mac --prefix desktop     # → desktop/dist/*.dmg + *.zip
npm run dist:linux --prefix desktop   # → desktop/dist/*.AppImage + *.deb
```

Hand the file to anyone — no Node.js needed on their machine. App data
(database, JWT secret) lives in the OS user-data dir:

| OS | Location |
|---|---|
| Windows | `%APPDATA%\Online Club\` |
| macOS | `~/Library/Application Support/Online Club/` |
| Linux | `~/.config/Online Club/` |

## Notes

- Marketing integrations work in the desktop app too (Admin → Marketing
  toolkits). Outbound calls need internet; **inbound** toolkit callbacks need
  a public URL, so point those at your hosted server install instead
  (see `docs/MARKETING.md`).
- Custom icon: drop a 512×512 `desktop/build/icon.png` (and `icon.icns` /
  `icon.ico` for mac/dmg polish) before running `desktop:dist`.
- Code-signing (removes OS warnings) needs Apple/Windows certificates —
  see the electron-builder docs.
