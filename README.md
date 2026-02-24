# EOY-Website

## Migrate from Cloudflared Tunnel to a Managed Backend Host (Render)

This project currently relies on a Cloudflared tunnel and a hardcoded tunnel API URL (`https://eoyapi.monty.my/api`).
Render is the easiest reliable paid replacement for this stack.

---

## Why Render for this project

- Your backend is a single Node/Express process listening on port `3000`.
- You use SQLite (`db.sqlite`) and local file uploads (`uplds/`), so you need persistent storage.
- Render supports a simple web service + persistent disk model with minimal ops overhead.

---

## What you need before starting

1. A Render account
2. Your code in GitHub/GitLab (so Render can deploy from the repo)
3. Your DNS provider access (for `eoyapi.monty.my`)
4. A strong JWT secret value (generate a random 32+ char string)

---

## Recommended production architecture

- **Render Web Service** for the Node API
- **Render Persistent Disk** mounted at `/var/data`
- Store both DB and uploads on that disk:
  - `/var/data/db.sqlite`
  - `/var/data/uplds`

---

## Exact setup steps

### 1) Update backend to use environment-based storage paths

#### A. `cfg/db.js`
Use `DATA_DIR` when present so SQLite stays on persistent storage.

Replace:

```js
const dbp = pth.join(__dirname, '..', 'db.sqlite');
```

With:

```js
const dataDir = process.env.DATA_DIR || pth.join(__dirname, '..');
const dbp = pth.join(dataDir, 'db.sqlite');
```

#### B. `svr.js`
Use a configurable uploads directory.

Add near top:

```js
const upldsDir = process.env.UPLDS_DIR || './uplds';
```

Change static + directory creation to:

```js
app.use('/uplds', exp.static(upldsDir));

if (!fs.existsSync(upldsDir)) {
  fs.mkdirSync(upldsDir, { recursive: true });
}
```

#### C. `rts/auth.js`
Replace hardcoded JWT secret with env var.

Replace:

```js
const sec = 'your_secret_key_12345';
```

With:

```js
const sec = process.env.JWT_SECRET;
if (!sec) {
  throw new Error('JWT_SECRET is required');
}
```

#### D. `api.js`
Change the production API URL to your Render/custom API domain.

Replace:

```js
return 'https://eoyapi.monty.my/api';
```

With your final API base, for example:

```js
return 'https://api.your-domain.com/api';
```

(You can keep `eoyapi.monty.my` if you point it to Render.)

---

### 2) Create the Render Web Service

1. In Render dashboard: **New +** → **Web Service**
2. Connect your repo
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Paid plan recommended for always-on + reliability
4. Add environment variables:
   - `NODE_ENV=production`
   - `DATA_DIR=/var/data`
   - `UPLDS_DIR=/var/data/uplds`
   - `JWT_SECRET=<your-random-secret>`
5. Add a **Persistent Disk**:
   - Mount path: `/var/data`
   - Size: start 1GB+

---

### 3) Point DNS to Render

1. In Render, add custom domain `eoyapi.monty.my` (or preferred API subdomain)
2. Render provides DNS target(s) (usually CNAME)
3. In your DNS provider, create/update records exactly as Render shows
4. Wait for certificate issuance and DNS propagation

---

### 4) Deploy and verify

After deployment, verify:

- `GET https://<your-api-domain>/api/health` returns `{ "ok": true }`
- Registration/login works
- Image/file uploads succeed and persist after a redeploy

Quick checks:

1. Upload a profile picture
2. Redeploy service in Render
3. Refresh profile; uploaded file should still exist

---


## Render crash fix: "Identifier 'upldsDir' has already been declared"

If Render logs show:

```
SyntaxError: Identifier 'upldsDir' has already been declared
```

Do this:

1. Make sure `svr.js` contains only one uploads path variable declaration and it matches current code in this repo (`uploadsDir`).
2. Push the latest commit and trigger a **Manual Deploy > Clear build cache & deploy** in Render.
3. Confirm env vars are set exactly:
   - `DATA_DIR=/var/data`
   - `UPLDS_DIR=/var/data/uplds`
   - `JWT_SECRET=<long-random-secret>`
4. Verify health endpoint returns JSON with `ok`, `db`, and `uploads`.
5. Important: this error is a JavaScript syntax issue in `svr.js`, not an environment-variable value issue. If it still appears, Render is deploying an older commit/branch or cached artifact; use **Clear build cache & deploy** and confirm the startup log prints `Render commit:` for the commit you just pushed.


## Common remaining failure points (if it still crashes)

1. **Render is deploying a different branch** (your logs showed `Checking out ... in branch Test1`). Ensure the Render service branch matches where fixes were pushed.
2. **Cached artifact/stale source** still contains `const upldsDir ...` even after code updates. Use **Manual Deploy → Clear build cache & deploy**.
3. **Duplicate declarations in merged file** from conflict resolution. The new `prestart` check now fails early with line numbers before `node svr.js` runs.
4. **Wrong start command or root directory** in Render (must run from repo root with `npm start`, and `svr.js` must be the same file you changed).
5. **Environment variables missing in the selected environment** (Preview vs Production values can differ). Verify `UPLDS_DIR`, `DATA_DIR`, and `JWT_SECRET` in the active environment.
6. **`initDb is not defined` at startup** means the deployed `svr.js` and `cfg/db.js` are out of sync. The server now checks `cfg/db.js` exports `initDb()` and fails with a clear message if not. Redeploy same commit for both files.

## Security and reliability checklist

- [ ] `JWT_SECRET` is set and not hardcoded in code
- [ ] CORS is restricted to your frontend domain(s)
- [ ] Persistent disk mounted and paths point to `/var/data`
- [ ] API domain switched from Cloudflared URL to Render domain
- [ ] Backups enabled (manual copy of SQLite file at minimum)

---

## Recommended next upgrade (optional)

When you have time, migrate from SQLite to managed Postgres for better concurrency and backup tooling. You can still launch now with SQLite + persistent disk, then migrate later.

