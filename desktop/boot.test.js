'use strict';

/**
 * Headless desktop boot test — no display / Electron binary needed.
 * Stubs the `electron` module, then runs the REAL main.js: in-process API
 * boot (migrate + seed on an isolated userData dir), random loopback port,
 * single-origin client serving, and window loadURL.
 *
 * Usage: npm test --prefix desktop   (runs automatically in CI too)
 * Requires: client/dist built (npm run build at repo root).
 */
const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const os = require('os');
const path = require('path');

const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'club-desktop-test-'));
let loadedUrl = null;
let quitCalled = false;

const electronStub = {
  app: {
    isPackaged: false,
    requestSingleInstanceLock: () => true,
    getPath: (name) => (name === 'userData' ? tmpUserData : os.tmpdir()),
    whenReady: () => Promise.resolve(),
    on: () => {},
    quit: () => { quitCalled = true; },
  },
  BrowserWindow: class FakeWindow {
    constructor(opts) {
      assert.ok(opts.webPreferences.preload.endsWith('preload.js'), 'window must use preload');
      assert.strictEqual(opts.webPreferences.nodeIntegration, false, 'no nodeIntegration in renderer');
      this.webContents = { setWindowOpenHandler() {}, on() {} };
    }
    async loadURL(url) { loadedUrl = url; }
    on() {}
  },
  Menu: { buildFromTemplate: (t) => t, setApplicationMenu() {} },
  shell: { openExternal() {} },
};

const origLoad = Module._load;
Module._load = function patchedLoad(request, ...rest) {
  if (request === 'electron') return electronStub;
  return origLoad.call(this, request, ...rest);
};

async function waitFor(cond, timeoutMs, label) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function main() {
  require('./main.js'); // boots with stubbed electron
  await waitFor(() => loadedUrl || quitCalled, 30000, 'window.loadURL');
  assert.ok(!quitCalled, 'app should not quit on boot');
  assert.match(loadedUrl, /^http:\/\/127\.0\.0\.1:\d+\/$/, 'window loads loopback base URL');

  // 1. Single-origin client.
  const page = await (await fetch(loadedUrl)).text();
  assert.ok(page.includes('Online Club'), 'serves the React client');

  // 2. API layers + real database.
  const health = await (await fetch(`${loadedUrl}api/v1/health`)).json();
  assert.strictEqual(health.status, 'ok');
  assert.ok(fs.existsSync(path.join(tmpUserData, 'online-club.db')), 'desktop database created in userData');
  assert.ok(fs.existsSync(path.join(tmpUserData, 'jwt-secret')), 'jwt secret persisted in userData');

  // 3. Seeded admin can log in (proves migrate+seed ran in-process).
  const login = await fetch(`${loadedUrl}api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@onlineclub.local', password: 'Admin123!' }),
  });
  assert.strictEqual(login.status, 200, 'seeded admin login works');
  const { token } = await login.json();

  // 4. Events + bookings flow through the desktop-served API.
  const events = await (await fetch(`${loadedUrl}api/v1/events?limit=2`)).json();
  assert.ok(events.total >= 1, 'seeded events visible');
  const booking = await fetch(`${loadedUrl}api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ event_id: events.rows[0].id, seats: 1 }),
  });
  assert.strictEqual(booking.status, 201, 'booking works in desktop mode');

  // 5. SPA fallback + API 404s behave (client routes don't break the API).
  const spa = await (await fetch(`${loadedUrl}events/anything`)).text();
  assert.ok(spa.includes('Online Club'), 'SPA fallback serves index.html');
  const missing = await fetch(`${loadedUrl}api/v1/nope`);
  assert.strictEqual(missing.status, 404);

  console.log('desktop boot test: ALL CHECKS PASSED');
  console.log(`  window URL : ${loadedUrl}`);
  console.log(`  userData   : ${tmpUserData}`);
}

main()
  .then(() => process.exit(0)) // apiServer keeps the loop alive; exit explicitly
  .catch((err) => {
    console.error('desktop boot test FAILED:', err.message);
    process.exit(1);
  });
