# BE Request: Personnel Lookup Consistency For Chat Metadata

Date: 2026-05-03
Requester: Frontend
Target: Backend development API

## Background

Chat message bubbles need stable sender metadata across every user perspective. The FE displays:

- username
- personnel level badge, for example `PL1`
- track badge, for example `GOV`
- optional note in the user info popup

At the moment, low PL users cannot call `GET /api/personnel` because it correctly returns `403`. Therefore chat must rely on a lightweight lookup endpoint that is safe for authenticated chat participants.

## Current Issue

`GET /api/personnel/lookup?usernames=Miky` returns an empty list even though `Miky` exists in `GET /api/personnel`:

```json
{
  "id": "0f808cdf-3d96-4cb5-b40b-ffb7bd5ce7ac",
  "username": "Miky",
  "email": "miky@morneven.com",
  "role": "personel",
  "level": 1,
  "track": "executive",
  "note": "Intern"
}
```

Because lookup returns no row, FE cannot reliably render `Miky` as `PL1 GOV` for PL3 and lower perspectives.

## Required Backend Behavior

Please update `GET /api/personnel/lookup` so it:

1. Accepts comma-separated usernames:

```http
GET /api/personnel/lookup?usernames=Miky,author,p.salim
```

2. Matches usernames case-insensitively.

3. Returns safe metadata for every existing username:

```json
{
  "success": true,
  "data": [
    {
      "id": "0f808cdf-3d96-4cb5-b40b-ffb7bd5ce7ac",
      "username": "Miky",
      "role": "personel",
      "level": 1,
      "track": "executive",
      "note": "Intern"
    }
  ]
}
```

4. Requires authenticated user, but should not require `PL >= 4`.

5. Does not expose email unless BE considers it safe for chat participant popups.

## Acceptance Checks

With an authenticated PL3 account:

```http
GET /api/personnel/lookup?usernames=Miky
```

Expected:

```json
{
  "success": true,
  "data": [
    {
      "username": "Miky",
      "level": 1,
      "track": "executive"
    }
  ]
}
```

With mixed usernames:

```http
GET /api/personnel/lookup?usernames=Miky,miky,AUTHOR,missing-user
```

Expected:

- `Miky` returned once.
- `author` returned once.
- missing usernames omitted.
- Response stays `200`.

## FE Temporary Mitigation

FE now caches safe personnel metadata from any successful roster or lookup response and uses a display fallback for `Miky = PL1 GOV`. This prevents the chat UI from showing `Miky` as `PL0 GUEST`, but backend lookup should still be fixed so the UI does not depend on cached or fallback metadata.
