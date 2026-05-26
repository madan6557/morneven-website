# Morneven Website

Morneven Website is the stable frontend application for the Morneven platform. It provides the user interface for public content, personnel collaboration, authoring, administration, security operations, analytics, backup, migration, and Bot Manager control.

The canonical documentation lives in the shared workspace `Document/` folder.

## Repository Role

`morneven-website` is responsible for:

- Vite React single-page application.
- Responsive themed UI.
- Route-level feature pages.
- Auth-aware navigation and UX guards.
- REST client integration with Morneven backend.
- WebSocket client integration for chat, notifications, badges, and presence-related updates.
- Authenticated media rendering through backend object proxy URLs.
- Authoring tools for content and media workflows.

The frontend does not own authorization. Backend responses and backend RBAC are the source of truth.

## Related Repositories

| Repository | Relationship |
| --- | --- |
| `morneven-backend` | Provides API, auth, database, storage, websocket, security, backup, migration, extraction, and Bot Manager data |
| `morneven_nanobot` | Runs the managed Nanobot gateway controlled by Bot Manager through backend sync endpoints |
| `morneven-website` | Presents the product UI and calls backend APIs |

## Available Features

- Landing page, login, registration, guest mode, and password reset flows.
- Command Center with configurable global presets.
- Activity analytics with visitors, views, engagement, and content drilldown.
- Projects with detail pages, metadata, patches, docs, features, and discussion.
- Gallery with images, videos, thumbnails, views, likes, dislikes, tags, publisher identity, and discussion.
- Lore / Wiki for characters, creatures, places, technology, events, other content, and personnel level information.
- Maps with markers and restricted marker tooling.
- Management workflows for personnel requests and review queues.
- Chat with direct messages, manual groups, system groups, attachments, replies, mentions, edits, and realtime updates.
- Bot Manager for PL7 Admin and PL7 Author control of Nanobot runtime personalities.
- Author Panel for projects, lore, gallery, news, command center, and map content.
- Security console for authorized security operators.
- Personnel management with search, filters, statuses, authority-aware actions, and last-online information.
- Settings for account, appearance, reports, chat reconciliation, chat reset, storage cleanup, extraction, backup, and migration.

## Runtime Configuration

Create environment variables in the deploy provider or local `.env` file:

```env
VITE_API_BASE_URL=https://<backend-host>/api
VITE_DEMO_FALLBACK=false
```

API base behavior:

- If `VITE_API_BASE_URL` already ends in `/api` or `/v1`, it is used as-is.
- If it points to a host root, the client appends `/api`.
- In local development without a configured value, localhost defaults to `http://localhost:3000/api`.
- Production host fallback points to the Morneven production backend.

## Development

Requirements:

- Node.js 24 or newer.
- npm 10 or newer.

Commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

Local development example:

```powershell
$env:VITE_API_BASE_URL="http://localhost:3000/api"
npm run dev
```

## Deployment

The frontend can be deployed on Vercel or any static hosting setup that supports the included server entrypoint.

Recommended production settings:

- Node.js 24 or newer.
- `VITE_API_BASE_URL` set to the target backend `/api` URL.
- Commit metadata passed by the deploy platform where available, such as `VERCEL_GIT_COMMIT_SHA`.
- No demo fallback in production unless explicitly testing degraded mode.

Health endpoints are provided by the static server when deployed through `server.mjs`:

```text
/health
/ready
/version
```

## Documentation

Active shared documentation:

- [Platform Architecture](../Document/Documentation/General/2026-05-25-platform-architecture-v01.md)
- [Website Feature Documentation](../Document/Documentation/Website/docs/2026-05-25-website-feature-documentation-v01.md)
- [Website Guidebook](../Document/Guide/Website/docs/2026-05-25-website-guidebook-v01.md)
- [Backend API Contract](../Document/Documentation/Backend/root-docs/2026-05-25-backend-api-contract-v01.md)
- [Bot Manager Guide](../Document/Guide/General/2026-05-27-bot-manager-guide-v01.md)
- [Document Index](../Document/Documentation/General/2026-05-27-document-index-v02.md)

When feature behavior changes, update `Document/` first and keep this README as the concise repo entrypoint.
