const fs = require('fs');
const crypto = require('crypto');

const file = 'svr.js';
const src = fs.readFileSync(file, 'utf8');
const lines = src.split(/\r?\n/);

const upldsDecls = [];
const uploadsDecls = [];
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (/\b(const|let|var)\s+upldsDir\b/.test(line)) upldsDecls.push(i + 1);
  if (/\b(const|let|var)\s+uploadsDir\b/.test(line)) uploadsDecls.push(i + 1);
}

const sha = crypto.createHash('sha1').update(src).digest('hex').slice(0, 12);
console.log(`[prestart-check] svr.js sha=${sha}`);
if (process.env.RENDER_GIT_COMMIT) {
  console.log(`[prestart-check] RENDER_GIT_COMMIT=${process.env.RENDER_GIT_COMMIT}`);
}

if (upldsDecls.length > 1) {
  console.error(`[prestart-check] Found duplicate 'upldsDir' declarations at lines: ${upldsDecls.join(', ')}`);
  console.error('[prestart-check] This means stale/merged code is being deployed. Clear Render build cache and redeploy the correct branch/commit.');
  process.exit(1);
}

if (uploadsDecls.length > 1) {
  console.error(`[prestart-check] Found duplicate 'uploadsDir' declarations at lines: ${uploadsDecls.join(', ')}`);
  process.exit(1);
}

console.log('[prestart-check] Entrypoint declaration check passed.');
