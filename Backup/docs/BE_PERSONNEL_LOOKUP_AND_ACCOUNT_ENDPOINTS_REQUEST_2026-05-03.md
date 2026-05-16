# Backend Request: Personnel Lookup and Account Security Endpoints

Date: 2026-05-03
Requester: Frontend
Target: Backend Development
Priority: P1 for Chat identity accuracy and account settings

## 1. Public Personnel Lookup for Chat

### Problem

Chat bubble theme and badges must reflect the sender's real personnel metadata, regardless of the viewer's PL.

Current issue:

- Low PL users may not receive the full `/api/personnel` list.
- FE cannot reliably resolve sender PL and track for higher PL users.
- Fallback logic is not sufficient because it can only guess known names like `author` or `admin`.

### Requested Endpoint

```http
GET /api/personnel/lookup?usernames=author,admin,p.salim
```

### Auth

Protected. Standard bearer token.

```http
Authorization: Bearer <token>
```

### Response

Return only safe public metadata required by chat identity.

```json
{
  "success": true,
  "data": [
    {
      "username": "author",
      "level": 7,
      "track": "executive",
      "note": "Full Authority"
    },
    {
      "username": "p.salim",
      "level": 3,
      "track": "field",
      "note": "Field specialist"
    }
  ]
}
```

### Field Rules

- `username`: required string
- `level`: required number, 0 to 7
- `track`: required string, one of `executive`, `field`, `mechanic`, `logistics`
- `note`: optional string

Do not include email, auth id, password metadata, private profile fields, or audit data.

### QA Acceptance

- A PL1 user can lookup `author` and receive `level: 7`, `track: "executive"`.
- Chat bubble for `author` shows `PL7 GOV`.
- Username click opens user info with username, PL, track, and note.

## 2. Forgot Password

### Endpoint

```http
POST /api/auth/forgot-password
```

### Auth

Public.

### Request

```json
{
  "email": "user@example.com"
}
```

### Response

Always return success to prevent account enumeration.

```json
{
  "success": true,
  "data": {
    "accepted": true
  }
}
```

### Expected Behavior

- If email exists, backend sends password reset instruction through configured channel.
- If email does not exist, backend still returns success.

## 3. Change Password

### Endpoint

```http
POST /api/auth/change-password
```

### Auth

Protected.

### Request

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword1234"
}
```

### Rules

- Verify current password.
- New password must follow backend policy, currently 12 to 128 characters.
- Invalidate refresh tokens if backend security policy requires it.

### Response

```json
{
  "success": true,
  "data": {
    "changed": true
  }
}
```

## 4. Delete Account

### Endpoint

```http
DELETE /api/auth/delete-account
```

### Auth

Protected.

### Request

```json
{
  "password": "CurrentPassword123"
}
```

### Rules

- Verify password before deletion.
- Define backend policy for authored content:
  - anonymize,
  - transfer ownership,
  - or block deletion if account owns critical content.
- Return `409 CONFLICT` if deletion is blocked by ownership constraints.
- Invalidate all tokens after successful deletion.

### Response

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## FE Implementation Notes

FE already includes UI hooks for:

- `GET /api/personnel/lookup`
- `POST /api/auth/forgot-password`
- `POST /api/auth/change-password`
- `DELETE /api/auth/delete-account`

If endpoint is unavailable, FE will show backend error toast or form error. There is no demo fallback for account security actions.

