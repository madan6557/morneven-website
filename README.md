# Morneven Website

Morneven Website is the React frontend for public content, personnel
collaboration, authoring, security operations, data backup, and ZeroClaw Bot
Manager control.

## Responsibilities

- Vite React single-page application.
- REST and WebSocket integration with Morneven Backend.
- Auth-aware navigation and user workflows.
- Authenticated media loading through backend object proxy endpoints.
- Data extraction, restore, scheduled backup, and storage cleanup UI.
- ZeroClaw personality, runtime schedule, and global freeze controls.

Backend authorization remains the security boundary.

## Requirements

- Node.js 24 or newer.
- npm 10 or newer.

## Runtime Configuration

```dotenv
VITE_API_BASE_URL=https://<backend-host>/api
VITE_DEMO_FALLBACK=false
```

If the backend hostname changes, update the CSP `connect-src` allowlist in both
`server.mjs` and `vercel.json`.

## Security Posture

- Inter, Orbitron, and Rajdhani are bundled locally.
- Google Fonts is not required.
- External scripts are restricted to the Vercel analytics script.
- Image and media rendering is restricted to self, data, and blob URLs.
- Storage media is fetched through authenticated backend proxy endpoints.
- Frames are limited to trusted YouTube and Vimeo embed hosts.
- Active script attributes, objects, framing, and external base URLs are
  blocked by CSP.
- Content navigation accepts internal paths and HTTP(S) URLs only.
- Static path resolution rejects traversal, backslashes, malformed encoding,
  and control characters.

## Available Operations

- Manual and scheduled data backup.
- One-time, relative-day, and weekly schedules with IANA timezone.
- Retention count and retention-day controls.
- Extraction stop and Retry from 0.
- Polling only while a job is queued or processing.
- Local date, time, and timezone display for backup timestamps.
- Scheduled start and stop for every ZeroClaw personality.
- Global runtime freeze for PL7 Author.

## Development

```bash
npm install
npm run dev
```

Quality gate:

```bash
npm run lint
npm test
npm run build
npm audit
```

Local API example:

```powershell
$env:VITE_API_BASE_URL="http://localhost:3000/api"
npm run dev
```

## Deployment

The app can run on Vercel or through `server.mjs`.

```bash
npm ci
npm run build
npm start
```

Health endpoints from `server.mjs`:

```text
/health
/ready
/version
```

The static server must keep the same security headers as `vercel.json`.

Detailed hardening, backup, restore, scheduler, ZeroClaw mount, redeployment,
and shutdown procedures are in the backend
[guide.md](../morneven-backend/guide.md).

## License

Copyright (c) 2026 madan6557.

No license is granted to use, copy, modify, or distribute this repository's
contents without explicit written permission from the owner.
