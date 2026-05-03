# Railway Frontend Deployment

Date: 2026-05-03
App: Morneven Website

## Summary

Frontend can now be deployed to Railway as a static Vite build served by a small Node server.

Railway provides the runtime port through `PORT`. The included `server.mjs` reads that value and serves `dist` with SPA fallback to `index.html`.

## Files Added

- `railway.json`
- `server.mjs`

## Railway Settings

Use these settings if Railway does not auto-detect from `railway.json`:

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm start
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

## Required Environment Variables

Set this in Railway Variables:

```text
VITE_API_BASE_URL=https://backend.dev.morneven.com
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

