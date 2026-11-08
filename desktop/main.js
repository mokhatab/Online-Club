'use strict';

/**
 * Online Club — desktop app (Electron).
 *
 * Runs the SAME layered API + database in-process (main process is Node.js)
 * and serves the built React client from it, so the whole product works
 * offline in one window with zero setup:
 *
 *   desktop window ──▶ http://127.0.0.1:<random port>/
 *                        ├─ /            → React client (single-origin)
 *                        ├─ /api/v1/…    → Express API layers
 *                        └─ database     → <userData>/online-club.db
 *
 * Dev:      npm start --prefix desktop   (uses ../server + ../client/dist)
 * Installers: npm run dist:win / dist:mac / dist:linux --prefix desktop
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let apiServer = null;
let baseUrl = null;

function resolvePaths() {
  if (app.isPackaged) {
    return {
      serverDir: path.join(process.resourcesPath, 'server'),
      clientDir: path.join(process.resourcesPath, 'client'),
    };
  }
  return {
    serverDir: path.join(__dirname, '..', 'server'),
    clientDir: path.join(__dirname, '..', 'client', 'dist'),
  };
}

/** Stable per-machine JWT secret, generated once and stored in userData. */
function ensureJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(app.getPath('userData'), 'jwt-secret');
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    const secret = 'desktop-' + crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, 'utf8');
    return secret;
  } catch {
    return 'desktop-' + crypto.randomBytes(16).toString('hex');
  }
}

/** Boot the API layers in-process and resolve the local base URL. */
async function startApi() {
  const { serverDir, clientDir } = resolvePaths();

  if (!fs.existsSync(path.join(serverDir, 'src', 'app.js'))) {
    throw new Error(`API source not found at ${serverDir}. Run npm run install:all first.`);
  }
  if (!fs.existsSync(path.join(clientDir, 'index.html'))) {
    throw new Error(
      `Web client build not found at ${clientDir}. Run "npm run build" from the repo root first.`
    );
  }

  process.env.NODE_ENV = 'production';
  process.env.DATABASE_PATH = path.join(app.getPath('userData'), 'online-club.db');
  process.env.SEED_ON_BOOT = process.env.SEED_ON_BOOT || 'true';
  process.env.JWT_SECRET = ensureJwtSecret();
  process.env.SERVE_CLIENT_DIR = clientDir;
  process.env.API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'http://127.0.0.1:4000';

  // Require server layers by absolute path (works dev + packaged).
   
  const { migrate } = require(path.join(serverDir, 'src', 'db', 'migrate.js'));
  const { seed } = require(path.join(serverDir, 'src', 'db', 'seed.js'));
  const { registerSubscriptions } = require(path.join(serverDir, 'src', 'services', 'subscriptions.js'));
  const { createApp } = require(path.join(serverDir, 'src', 'app.js'));

  migrate();
  await seed().catch((err) => console.error('[desktop] seed failed:', err.message));
  registerSubscriptions();

  const expressApp = createApp();
  // Port 0 = random free loopback port (no conflicts, no admin rights).
  await new Promise((resolve) => {
    apiServer = expressApp.listen(0, '127.0.0.1', resolve);
  });
  const port = apiServer.address().port;
  console.log(`[desktop] API + client on http://127.0.0.1:${port}`);
  return `http://127.0.0.1:${port}`;
}

function buildMenu() {
  const template = [
    {
      label: 'Online Club',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'API docs (in window)', click: () => baseUrl && mainWindow?.loadURL(`${baseUrl}/api/docs`) },
        { label: 'Open docs on GitHub', click: () => shell.openExternal('https://github.com/mokhatab/Online-Club') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  baseUrl = await startApi();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Online Club',
    backgroundColor: '#0f1222',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep the app in-window; open external links in the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(baseUrl)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(baseUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  buildMenu();
  await mainWindow.loadURL(`${baseUrl}/`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance: focus the existing window instead of a second copy.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow).catch((err) => {
    console.error('[desktop] failed to start:', err.message);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (apiServer) apiServer.close();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
