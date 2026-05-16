# Backend Request: Persist Chat Reconciliation Result

Date: 2026-05-03
Requester: Frontend
Target: Backend Development
Priority: P1 for Settings QA

## Background

System Chat Reconciliation sudah berjalan dan `POST /api/chat/reconcile` mengembalikan report yang benar.

Observed behavior dari FE QA:

1. Sebelum sync, Settings menampilkan data dari backend:

```text
System channels: 5
Active members: 36
Team groups: 0
Institute groups: 1
Division groups: 4
Removed memberships: 44
```

2. Setelah klik `Sync Groups`, response reconcile menampilkan:

```text
System channels: 7
Active members: 42
Team groups: 2
Institute groups: 1
Division groups: 4
Removed memberships: 44
```

3. Setelah browser refresh, FE membaca ulang backend dan nilai kembali ke kondisi sebelum sync:

```text
System channels: 5
Active members: 36
Team groups: 0
```

Ini mengindikasikan hasil `POST /api/chat/reconcile` belum dipersist, atau endpoint read yang dipakai FE belum membaca state hasil reconciliation terbaru.

## Current FE Behavior

Saat Settings dibuka, FE membaca state system chat dari:

```http
GET /api/chat/conversations
```

FE menghitung metric dari conversations yang `systemManaged` atau kind:

- `institute`
- `division`
- `team`

Saat tombol Sync Groups diklik, FE memanggil:

```http
POST /api/chat/reconcile
```

FE menampilkan report dari response POST. Tidak ada demo fallback dan tidak ada local calculation untuk hasil sync.

## Required Backend Behavior

`POST /api/chat/reconcile` harus melakukan persistence, bukan hanya menghitung report transient.

Setelah POST sukses, salah satu dari kontrak ini harus benar:

### Option A: Persist to Chat Conversations

Setelah:

```http
POST /api/chat/reconcile
```

Request berikut:

```http
GET /api/chat/conversations
```

harus mengembalikan state yang sudah direconcile, termasuk team system groups.

Acceptance example:

- Sebelum sync: `teamGroups = 0`
- Setelah sync: response POST `teamGroups = 2`
- Setelah refresh FE: `GET /api/chat/conversations` harus cukup untuk FE menghitung `teamGroups = 2`

### Option B: Provide Reconciliation Status Endpoint

Jika backend tidak ingin FE derive metric dari conversations, sediakan endpoint read-only:

```http
GET /api/chat/reconcile/status
```

Expected response:

```json
{
  "success": true,
  "data": {
    "instituteGroups": 1,
    "divisionGroups": 4,
    "teamGroups": 2,
    "activeMemberships": 42,
    "removedMemberships": 44,
    "ranAt": "2026-05-03T14:56:02.000Z"
  }
}
```

`ranAt` harus timestamp sync terakhir yang persist di backend, bukan waktu request status.

## Required Response Shape

`POST /api/chat/reconcile` tetap perlu return shape lengkap:

```json
{
  "success": true,
  "data": {
    "instituteGroups": 1,
    "divisionGroups": 4,
    "teamGroups": 2,
    "activeMemberships": 42,
    "removedMemberships": 44,
    "ranAt": "2026-05-03T14:56:02.000Z"
  }
}
```

All numeric fields must be numbers.

## QA Acceptance Criteria

1. Open Settings.
2. Record initial values.
3. Click `Sync Groups`.
4. Confirm values update from POST response.
5. Refresh browser.
6. Values must remain equal to the latest reconciled backend state.
7. Team groups must not drop back to `0` after refresh.
8. `Last sync` must show the last persisted reconciliation time if backend provides it.

## FE Note

FE can support either backend approach:

- If `GET /api/chat/conversations` reflects reconciled state, no FE endpoint change is required.
- If BE adds `GET /api/chat/reconcile/status`, FE can switch Settings to read that endpoint on page load.

