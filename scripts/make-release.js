'use strict';

/**
 * Packs a downloadable release: full source + tests + deploy files.
 * Output: release/online-club-v<version>.{zip,tar.gz} (+ .sha256 checksums)
 *
 * Excluded: node_modules, .git, databases, .env secrets, build outputs,
 * desktop installers, and the release dir itself.
 *
 * Usage: npm run release
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const version = require(path.join(ROOT, 'package.json')).version;
const STAGE_PARENT = fs.mkdtempSync(path.join(os.tmpdir(), 'club-release-'));
const STAGE = path.join(STAGE_PARENT, `online-club-v${version}`);
const OUT_DIR = path.join(ROOT, 'release');

const SKIP_DIRS = new Set(['node_modules', '.git', 'data', 'dist', 'build', 'release', '.turbo']);
const SKIP_FILES = new Set(['.env', '.env.local']);

function copyFiltered(src, dest) {
  const stat = fs.statSync(src);
  const base = path.basename(src);
  if (stat.isDirectory()) {
    if (SKIP_DIRS.has(base)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyFiltered(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isFile()) {
    if (SKIP_FILES.has(base)) return;
    if (base.endsWith('.db') || base.endsWith('.db-journal')) return;
    fs.copyFileSync(src, dest);
  }
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function main() {
  console.log(`[release] staging online-club v${version}…`);
  fs.mkdirSync(STAGE, { recursive: true });
  for (const entry of fs.readdirSync(ROOT)) {
    if (entry === 'release') continue;
    copyFiltered(path.join(ROOT, entry), path.join(STAGE, entry));
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const tarball = path.join(OUT_DIR, `online-club-v${version}.tar.gz`);
  execSync(`tar -czf "${tarball}" -C "${STAGE_PARENT}" "online-club-v${version}"`, { stdio: 'inherit' });

  let zipball = null;
  try {
    execSync('command -v zip', { stdio: 'ignore' });
    zipball = path.join(OUT_DIR, `online-club-v${version}.zip`);
    if (fs.existsSync(zipball)) fs.rmSync(zipball);
    execSync(`zip -qr "${zipball}" "online-club-v${version}"`, { cwd: STAGE_PARENT, stdio: 'inherit' });
  } catch {
    console.log('[release] `zip` not found — skipping .zip (tar.gz is done)');
  }

  const files = [tarball, zipball].filter(Boolean);
  const sums = files.map((f) => `${sha256(f)}  ${path.basename(f)}`).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT_DIR, `online-club-v${version}.sha256`), sums);

  fs.rmSync(STAGE_PARENT, { recursive: true, force: true });
  console.log('[release] done:');
  for (const f of files) {
    console.log(`  ${path.basename(f)}  ${(fs.statSync(f).size / 1024).toFixed(1)} KB  sha256:${sha256(f).slice(0, 12)}…`);
  }
}

main();
