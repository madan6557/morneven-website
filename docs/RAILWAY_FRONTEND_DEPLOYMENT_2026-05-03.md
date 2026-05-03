# Railway Frontend Deployment

Date: 2026-05-03
App: Morneven Website

## Summary

Frontend can now be deployed to Railway as a static Vite build served by a small Node server.

Railway provides the runtime port through `PORT`. The included `server.mjs` reads that value and serves `dist` with SPA fallback to `index.html`.

## Files Added

- `railway.json`
- `nixpacks.toml`
- `.node-version`
- `.nvmrc`
- `server.mjs`
- `Dockerfile`

## Runtime Version

Railway Nixpacks must use Node 20 or newer. Node 18 has reached end of life and may fail during the Railway build image generation.

This repo pins Node through:

- `package.json` engines
- `.node-version`
- `.nvmrc`
- `nixpacks.toml`

## Railway Settings

Use these settings if Railway does not auto-detect from `railway.json`:

Build command:

```bash
npm run build
```

Start command:

```bash
node server.mjs
```

Public networking target port:

```text
Use the PORT environment variable provided by Railway.
```

If Railway asks for a fixed target port in the UI, use:

```text
3000
```

The server still binds to `process.env.PORT` when Railway injects it.

## 502 Troubleshooting

Railway `502 Application failed to respond` means the service did not expose a running HTTP server on the expected port.

Check Deploy Logs for this line:

```text
Morneven frontend listening on 0.0.0.0:<port>
```

If that line is missing, the runtime process did not start. Confirm Railway is using:

```text
Start Command: node server.mjs
```

If the service was generated with an old target port, remove the generated public domain and generate it again, or set the target port to:

```text
3000
```

The app also exposes:

```http
GET /health
GET /ready
```

Both should return `{"ok":true}`.

If Nixpacks still fails, deploy with the included `Dockerfile`. For Dockerfile deployment, pass this build argument if Railway does not automatically expose it during build:

```text
VITE_API_BASE_URL=https://backend.dev.morneven.com
```

## Required Environment Variables

Set this in Railway Variables:

```text
VITE_API_BASE_URL=https://backend.dev.morneven.com
```

If Railway still tries Node 18, add this Railway variable manually:

```text
NODE_VERSION=20
```

The FE client accepts either:

```text
https://backend.dev.morneven.com
```

or:

```text
https://backend.dev.morneven.com/api
```

Both resolve to the correct REST API prefix.

## Smoke Test

After deployment:

1. Open the Railway generated domain.
2. Login with the seed author account.
3. Confirm Network tab shows:

```http
GET /api/command-center
```

against the backend domain.

4. Refresh a nested route such as `/home` or `/projects`.
5. Confirm the page loads instead of returning 404.
