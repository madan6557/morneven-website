# Backend Request: Runtime Fixes for Map, Extraction, and Chat Reconciliation

Date: 2026-05-03
Requester: Frontend
Target: Backend Development
Priority: P1 for post integration QA

## 1. Map Image Endpoint

Endpoint:

```http
GET /api/map/image
```

Current issue:

Backend can return:

```text
https://placeholder.local/map.png
```

This URL is not resolvable in production browsers.

Request:

- Do not return `placeholder.local` URLs.
- If no custom map image exists, return an empty value:

```json
{
  "success": true,
  "data": {
    "url": ""
  }
}
```

or:

```json
{
  "success": true,
  "data": ""
}
```

FE will render the internal SVG placeholder when URL is empty.

## 2. Extraction Download Endpoint

Endpoint:

```http
GET /api/settings/extractions/:id/download
```

FE now downloads with bearer token using `fetch`, not a plain anchor.

Request:

- Accept standard bearer auth.
- Return binary ZIP content.
- Include a ZIP content type:

```http
Content-Type: application/zip
```

- Include filename when possible:

```http
Content-Disposition: attachment; filename="morneven-extract-all-<id>.zip"
```

- Ensure CORS allows FE origin and exposes `Content-Disposition` if filename is expected from header:

```http
Access-Control-Expose-Headers: Content-Disposition
```

## 3. Extraction History Polling

Endpoint:

```http
GET /api/settings/extractions
```

FE now calls this once when Settings opens, and only polls every 3 seconds while at least one job has status:

```text
processing
```

Request:

- Return accurate `status` values:
  - `processing`
  - `completed`
  - `failed`
- Completed and failed jobs should stop changing unless manually cleared.

## 4. Chat Reconciliation Response

Endpoint:

```http
POST /api/chat/reconcile
```

Expected response:

```json
{
  "success": true,
  "data": {
    "instituteGroups": 1,
    "divisionGroups": 4,
    "teamGroups": 3,
    "activeMemberships": 28,
    "removedMemberships": 0,
    "ranAt": "2026-05-03T12:00:00.000Z"
  }
}
```

All numeric fields should be numbers and should not be `null` or missing.

FE currently normalizes missing fields to `0`, but backend should still return the complete shape for QA clarity.

