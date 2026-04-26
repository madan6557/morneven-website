# Backend Requirement Morneven Institute

Dokumen ini adalah spesifikasi backend yang disesuaikan dengan fitur frontend saat ini. Tujuannya agar development backend bisa langsung berjalan tanpa ambigu, termasuk kontrak route, logika akses, variabel request/response, validasi, dan format error.

## Update Sistem (April 2026)

Analisa codebase terbaru menunjukkan beberapa perubahan penting yang wajib tercermin di backend:

1. News sekarang mendukung detail page (`hasDetail`) dan lampiran (`attachments`).
2. Command Center Settings bertambah `itemLimits` dan `manualSelections`.
3. Discussion untuk lore disimpan sebagai field `discussions` pada entity lore; gallery tetap memakai `comments`.
4. Author panel L6 non-executive tidak memiliki akses write ke news.
5. Endpoint gallery comments perlu dukung edit/delete reply.

Dokumen ini sudah diperbarui agar selaras dengan kontrak data frontend saat ini sekaligus menjaga keamanan backend (validasi server-side + RBAC).

## 1. Ruang Lingkup Fitur

Backend wajib mendukung modul berikut:

1. Authentication: login, register, me, logout, validasi token.
2. Lore: characters, places, technology, creatures, other lore (CRUD + detail).
3. Projects: list, detail, create, update, delete.
4. Gallery: list/detail item, upload, edit/delete, comments, replies.
5. Map: markers dan map image.
6. Personnel: list/detail/create/update/delete + bulk update.
7. Settings: command center settings per user.
8. News: feed pengumuman.

## 2. Standar API

### 2.1 Base URL

- Development: `/api`
- Production: menyesuaikan gateway/reverse proxy.

### 2.2 Format Response Sukses

Gunakan format konsisten:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Untuk list:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

### 2.3 Format Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Email tidak valid"
    }
  ]
}
```

### 2.4 Status Code

- 200: sukses read/update/delete.
- 201: sukses create.
- 400: request tidak valid.
- 401: token tidak ada/tidak valid.
- 403: tidak punya akses.
- 404: data tidak ditemukan.
- 409: konflik data (mis. email sudah dipakai).
- 500: server error.

## 3. Model Otorisasi (Wajib)

### 3.1 User Role

- `author`
- `personel`
- `guest`

### 3.2 Personnel Level (PL)

- Level `0..7`.
- L7 = Full Authority.
- Threshold restricted content default: L3.

### 3.3 Track

- `executive`
- `field`
- `mechanic`
- `logistics`

### 3.4 Rule Akses Utama

1. L7: akses penuh seluruh modul.
2. L6 executive: full author panel + moderasi diskusi.
3. L6 field: edit lore `places` dan `creatures`, plus gallery milik sendiri.
4. L6 mechanic: edit `projects` dan `technology`, plus gallery milik sendiri.
5. L6 logistics: hanya gallery milik sendiri.
6. L0-L5: read-only (sesuai batas restricted block).
7. Personnel management: hanya L7.
8. News write (create/update/delete): hanya L7 atau L6 executive.

### 3.5 Restricted Block (Lore)

Backend harus mendukung konten yang berisi marker:

- `[L3+] ... [/L3+]`
- `[L5+ track=field] ... [/L5+]`

Frontend akan parsing marker, tetapi backend tetap harus menyimpan `fullDesc` apa adanya agar rule tidak rusak.

## 4. Route Aplikasi ke Kebutuhan Endpoint

1. `/auth` -> auth endpoints.
2. `/home` -> summary projects/news/characters/settings.
3. `/projects`, `/projects/:id` -> projects endpoints.
4. `/gallery`, `/gallery/:id` -> gallery endpoints + comments/replies.
5. `/lore`, `/lore/:category`, detail lore -> lore endpoints per domain.
6. `/maps` -> map markers + map image endpoint.
7. `/author` -> seluruh endpoint CRUD dengan guard otorisasi.
8. `/personnel` -> personnel endpoint (L7 only).
9. `/settings` -> settings endpoint per user.

## 4.1 Author Panel Access Matrix

Author panel adalah surface CRUD internal yang dipakai frontend untuk mengelola data konten. Backend harus membedakan akses berdasarkan `level` dan `track`.

1. `L7` -> akses penuh ke semua section, termasuk moderasi diskusi dan seluruh CRUD.
2. `L6 executive` -> akses penuh ke author panel, plus moderasi diskusi lintas user.
3. `L6 field` -> dapat masuk panel untuk `lore/places`, `lore/creatures`, dan gallery milik sendiri.
4. `L6 mechanic` -> dapat masuk panel untuk `projects`, `lore/technology`, dan gallery milik sendiri.
5. `L6 logistics` -> hanya dapat masuk panel untuk gallery milik sendiri.
6. `L0-L5` -> tidak memiliki akses write ke author panel.
7. `News` section -> hanya `L7` atau `L6 executive`.

Catatan:

1. Gallery write access tetap harus diverifikasi dengan ownership `uploadedBy` di backend.
2. Untuk edit/delete komentar diskusi, aturan moderator mengikuti section 5.8 dan 5.13.
3. Jika UI mengirim request ke section yang tidak sesuai track, backend harus menolak dengan `403`.

## 5. Daftar Endpoint Lengkap

## 5.1 Authentication

### POST /api/auth/login

- Body:

```json
{
  "email": "user@morneven.com",
  "password": "secret123"
}
```

- Response data:

```json
{
  "token": "jwt-token",
  "refreshToken": "optional-refresh-token",
  "user": {
    "id": "psn-001",
    "username": "Mikyl",
    "email": "user@morneven.com",
    "role": "personel",
    "level": 2,
    "track": "executive",
    "note": "Optional"
  }
}
```

### POST /api/auth/register

- Body:

```json
{
  "email": "new@morneven.com",
  "password": "secret123",
  "username": "NewUser"
}
```

- Rule:
  - default role: `personel`
  - default level: `2`
  - default track: `executive`

### GET /api/auth/me

- Header: `Authorization: Bearer <token>`
- Response data: object user aktif.

### POST /api/auth/logout

- Invalidasi refresh token/session.

### POST /api/auth/validate-token

- Cek token valid/tidak untuk rehydrate session frontend.

## 5.2 Projects

### GET /api/projects

- Query opsional: `status`, `search`, `page`, `limit`, `sort`.

### GET /api/projects/:id

### POST /api/projects

- Akses: L7 atau L6 mechanic/executive.

### PUT /api/projects/:id

### DELETE /api/projects/:id

## 5.3 Lore - Characters

### GET /api/lore/characters
### GET /api/lore/characters/:id
### POST /api/lore/characters
### PUT /api/lore/characters/:id
### DELETE /api/lore/characters/:id

Rule edit: L7 atau L6 executive.

## 5.4 Lore - Places

### GET /api/lore/places
### GET /api/lore/places/:id
### POST /api/lore/places
### PUT /api/lore/places/:id
### DELETE /api/lore/places/:id

Rule edit: L7 atau L6 field.

## 5.5 Lore - Technology

### GET /api/lore/technology
### GET /api/lore/technology/:id
### POST /api/lore/technology
### PUT /api/lore/technology/:id
### DELETE /api/lore/technology/:id

Rule edit: L7 atau L6 mechanic.

## 5.6 Lore - Creatures

### GET /api/lore/creatures
### GET /api/lore/creatures/:id
### POST /api/lore/creatures
### PUT /api/lore/creatures/:id
### DELETE /api/lore/creatures/:id

Rule edit: L7 atau L6 field.

## 5.7 Lore - Other

### GET /api/lore/other
### GET /api/lore/other/:id
### POST /api/lore/other
### PUT /api/lore/other/:id
### DELETE /api/lore/other/:id

Rule edit: L7 atau L6 executive.

## 5.8 Gallery

### GET /api/gallery

- Query opsional: `type=image|video`, `tag`, `search`, `page`, `limit`.

### GET /api/gallery/:id
### POST /api/gallery
### PUT /api/gallery/:id
### DELETE /api/gallery/:id

Rule:

1. Create: minimum L6 semua track.
2. Update/Delete: L7 atau owner (`uploadedBy` sama dengan username user aktif).
3. Guest tidak boleh create/update/delete.

### POST /api/gallery/:id/comments

- Body:

```json
{
  "text": "Komentar",
  "mentions": ["Mikyl", "Admin"]
}
```

- `author` diambil dari token server-side, bukan dari body.

### POST /api/gallery/:id/comments/:commentId/replies

- Body sama seperti comments.

### PUT /api/gallery/:id/comments/:commentId
### DELETE /api/gallery/:id/comments/:commentId
### PUT /api/gallery/:id/comments/:commentId/replies/:replyId
### DELETE /api/gallery/:id/comments/:commentId/replies/:replyId

Rule moderasi:

- Pemilik komentar boleh edit/delete miliknya.
- L6 executive atau L7 boleh moderasi komentar siapa pun.

## 5.9 Map

### GET /api/map/markers
### PUT /api/map/markers

- PUT hanya L7.

### GET /api/map/image
### PUT /api/map/image

- PUT hanya L7.

## 5.10 Personnel

### GET /api/personnel
### GET /api/personnel/:id
### POST /api/personnel
### PUT /api/personnel/:id
### DELETE /api/personnel/:id
### PATCH /api/personnel/bulk

Semua endpoint personnel hanya L7.

Rule tambahan:

1. Tidak boleh promote via UI ke L7 sembarang user tanpa policy internal.
2. Disarankan blok edit/delete akun L7 lain kecuali super-admin policy.

## 5.11 Settings

### GET /api/settings/command-center
### PUT /api/settings/command-center

Scope per user (berdasarkan user id dari token).

### 5.11.1 Command Center Settings

Frontend memakai satu payload setting per user untuk mengontrol konten yang tampil di halaman `/home`.

```ts
interface CommandCenterSettings {
  showStats: boolean;
  showProjects: boolean;
  showNews: boolean;
  showCharacters: boolean;
  showPlaces: boolean;
  showTechnology: boolean;
  showGallery: boolean;
  showQuickActions: boolean;
  welcomeMessage: string;
  itemLimits: {
    projects: number;
    news: number;
    characters: number;
    places: number;
    technology: number;
    gallery: number;
  };
  manualSelections: {
    projects: string[];
    news: string[];
    characters: string[];
    places: string[];
    technology: string[];
    gallery: string[];
  };
}
```

Default value:

```json
{
  "showStats": true,
  "showProjects": true,
  "showNews": true,
  "showCharacters": true,
  "showPlaces": true,
  "showTechnology": true,
  "showGallery": true,
  "showQuickActions": true,
  "welcomeMessage": "Here's your operational overview.",
  "itemLimits": {
    "projects": 5,
    "news": 6,
    "characters": 3,
    "places": 3,
    "technology": 3,
    "gallery": 4
  },
  "manualSelections": {
    "projects": [],
    "news": [],
    "characters": [],
    "places": [],
    "technology": [],
    "gallery": []
  }
}
```

Rule penting:

1. Settings harus di-scope per user, bukan global.
2. Update settings tidak boleh memodifikasi user lain.
3. Jika backend mengubah settings, response harus mengembalikan object setting final yang sudah tersimpan.
4. Frontend saat ini mengharapkan perubahan settings bisa dipakai segera di Command Center/HomePage setelah reload atau rehydrate session.
5. Untuk migrasi dari localStorage, gunakan key referensi `morneven_cc_settings` sebagai mapping awal.

## 5.12 News

### GET /api/news
### GET /api/news/:id
### POST /api/news
### PUT /api/news/:id
### DELETE /api/news/:id

Write operation: L7 atau L6 executive.

### 5.12.1 News Payload (Updated)

Frontend saat ini memakai field berikut:

```ts
interface NewsAttachment {
  type: "image" | "video" | "link";
  url: string;
  caption?: string;
}

interface NewsItem {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  hasDetail?: boolean;
  thumbnail?: string;
  body?: string;
  attachments?: NewsAttachment[];
}
```

Rule:

1. Jika `hasDetail !== true`, `body`, `thumbnail`, dan `attachments` boleh kosong.
2. Jika `hasDetail === true`, backend wajib menerima dan menyimpan `body` (opsional untuk legacy data lama).
3. `attachments[].type` wajib salah satu `image|video|link`.

## 5.13 Discussion Management

Discussion dipakai lintas entity lore dan disimpan sebagai field `discussions` pada object entity.
Entity aktif: `places|technology|other|characters|creatures`.
Gallery menggunakan endpoint komentar terpisah pada section 5.8.

### GET /api/discussions/:entityType/:entityId

- `entityType`: `places|technology|other|characters|creatures`
- Response: list discussion thread milik entity.

### POST /api/discussions/:entityType/:entityId/comments

- Body:

```json
{
  "text": "Status perimeter aman @j.huang",
  "mentions": [
    { "username": "j.huang", "start": 22, "end": 30 }
  ]
}
```

- `author` diambil dari token server-side.

### POST /api/discussions/:entityType/:entityId/comments/:commentId/replies

- Body sama dengan create comment.

### PATCH /api/discussions/:entityType/:entityId/comments/:commentId
### DELETE /api/discussions/:entityType/:entityId/comments/:commentId

### PATCH /api/discussions/:entityType/:entityId/comments/:commentId/replies/:replyId
### DELETE /api/discussions/:entityType/:entityId/comments/:commentId/replies/:replyId

Rule akses:

1. Guest tidak boleh create/edit/delete.
2. Pemilik comment/reply boleh edit/delete miliknya.
3. Moderator (L6 executive atau L7) boleh moderasi lintas user.

Catatan implementasi:

1. Untuk kompatibilitas frontend saat ini, backend boleh mengembalikan payload entity lengkap yang sudah berisi field `discussions`.
2. Bila memakai endpoint `/api/discussions/*`, sinkronisasi tetap harus menulis ke field `discussions` pada entity terkait.

## 6. Variabel Data yang Diperlukan

## 6.1 Project

```ts
interface Project {
  id: string;
  title: string;
  status: "Planning" | "On Progress" | "On Hold" | "Completed" | "Canceled";
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  patches: {
    version: string;
    date: string; // YYYY-MM-DD
    notes: string;
  }[];
  docs: {
    type: "image" | "video";
    url: string;
    caption: string;
  }[];
}
```

## 6.2 Character

```ts
interface Character {
  id: string;
  name: string;
  race: string;
  occupation?: string;
  height: string;
  traits: string[];
  likes: string[];
  dislikes: string[];
  accentColor: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  stats: {
    combat: number;
    intelligence: number;
    stealth: number;
    charisma: number;
    endurance: number;
  };
  docs: { type: "image" | "video"; url: string; caption: string }[];
  contributions?: { id: string; title: string; description: string; date?: string }[];
  discussions?: DiscussionComment[];
}
```

## 6.3 Place

```ts
interface Place {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: { type: "image" | "video"; url: string; caption: string }[];
  discussions?: DiscussionComment[];
}
```

## 6.4 Technology

```ts
interface Technology {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: { type: "image" | "video"; url: string; caption: string }[];
  discussions?: DiscussionComment[];
}
```

## 6.5 Creature

```ts
interface Creature {
  id: string;
  name: string;
  classification: "Amorphous" | "Crystalline" | "Metamorphic" | "Catalyst" | "Singularity" | "Zero-State";
  dangerLevel: 1 | 2 | 3 | 4 | 5;
  habitat: string;
  thumbnail: string;
  accentColor: string;
  shortDesc: string;
  fullDesc: string;
  docs: { type: "image" | "video"; url: string; caption: string }[];
  discussions?: DiscussionComment[];
}
```

## 6.6 Other Lore

```ts
interface OtherLore {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: { type: "image" | "video"; url: string; caption: string }[];
  discussions?: DiscussionComment[];
}
```

## 6.7 Gallery

```ts
interface GalleryItem {
  id: string;
  type: "image" | "video";
  title: string;
  thumbnail: string;
  videoUrl?: string;
  caption: string;
  tags: string[];
  date: string;
  uploadedBy?: string;
  comments: {
    id: string;
    author: string;
    text: string;
    date: string;
    mentions?: { username: string; start: number; end: number }[];
    replies: { id: string; author: string; text: string; date: string }[];
  }[];
}
```

## 6.7.1 Discussion (Generic)

```ts
interface DiscussionMention {
  username: string;
  start: number;
  end: number;
}

interface DiscussionReply {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
}

interface DiscussionComment {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
  replies: DiscussionReply[];
}
```

Untuk entity lore, gunakan field `discussions` pada object entity.

## 6.8 Map Marker

```ts
interface MapMarker {
  id: string;
  name: string;
  status: "safe" | "caution" | "danger" | "restricted" | "mission";
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  description: string;
  loreLink?: string;
}
```

## 6.9 Personnel

```ts
interface PersonnelUser {
  id: string;
  username: string;
  email: string;
  role: "author" | "personel" | "guest";
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  track: "executive" | "field" | "mechanic" | "logistics";
  note?: string;
  updatedAt?: string;
}
```

## 6.10 Command Center Settings

```ts
interface CommandCenterSettings {
  showStats: boolean;
  showProjects: boolean;
  showNews: boolean;
  showCharacters: boolean;
  showPlaces: boolean;
  showTechnology: boolean;
  showGallery: boolean;
  showQuickActions: boolean;
  welcomeMessage: string;
  itemLimits: {
    projects: number;
    news: number;
    characters: number;
    places: number;
    technology: number;
    gallery: number;
  };
  manualSelections: {
    projects: string[];
    news: string[];
    characters: string[];
    places: string[];
    technology: string[];
    gallery: string[];
  };
}
```

## 7. Validasi Wajib

1. Email format valid.
2. Password minimal 6 karakter.
3. Username minimal 3 karakter.
4. `level` hanya 0..7.
5. `track` hanya `executive|field|mechanic|logistics`.
6. `dangerLevel` creature hanya 1..5.
7. `type` media hanya `image|video`.
8. `x` dan `y` map marker harus di rentang 0..1.
9. `status` project dan map harus sesuai enum.
10. Validasi mention index (`start < end`, range valid terhadap panjang text).
11. Validasi `mentions[].username` harus ada di personnel registry.
12. `NewsAttachment.type` hanya `image|video|link`.
13. Untuk `manualSelections`, setiap ID harus ada di collection section terkait.
14. Untuk `itemLimits`, nilai harus bilangan bulat `>= 0`.

## 8. Logika Bisnis Penting

1. `uploadedBy` pada gallery wajib diisi dari user token saat create.
2. Ownership gallery divalidasi backend (jangan hanya frontend).
3. `author` komentar/reply diambil dari token, bukan request body.
4. Bulk personnel update hanya mengubah field yang dikirim.
5. Semua write endpoint wajib audit trail minimal: `updatedAt`, `updatedBy` (disarankan).
6. Gunakan soft-delete jika dibutuhkan histori moderation.
7. Pairing discussion wajib berbasis `entityType + entityId` agar tidak tercampur antar konten.
8. Role `author` tidak boleh diberikan bebas; penerbitan role ini harus mengikuti whitelist/policy internal.

## 8.X Update Sistem (April 24, 2026) - Personnel & Content Management

Penambahan modul Management, Notifications, Chat, dan Project archiving wajib didukung backend:

### 8.X.1 Management Requests

Tabel `mgmt_requests`:

- `id`, `kind` (transfer | clearance | submission_personal | submission_team | team_change | executive_promotion)
- `requester` (username), `requesterTrack`, `requesterLevel`
- `payload` (JSON; lihat per-kind di bawah), `reason`, `status` (pending | approved | rejected)
- `reviewer`, `reviewNote`, `createdAt`, `decidedAt`

Endpoint:

- `GET    /api/mgmt/requests` (filter: kind, status, requester)
- `POST   /api/mgmt/requests`
- `POST   /api/mgmt/requests/:id/decision` body `{ decision, reviewNote }`

Aturan reviewer (server-side wajib enforce, tidak boleh hanya UI):

- transfer → PL5 dari `payload.targetTrack`
- clearance | submission_personal | submission_team | team_change → PL4 same track
- executive_promotion → PL6 (any track) atau PL7
- Self-approval terlarang. PL7 bypass semua selain self-approval.

Side effects on `approved`:

1. transfer → `personnel.track := payload.targetTrack` + sync chat division group + push notification.
2. clearance → `personnel.level := payload.targetLevel` + push notification.
3. submission_personal → `gallery.create({...payload.item, uploadedBy: requester})` + bump `quota.monthly[YYYY-MM]` + notif.
4. submission_team → `projects.create({...payload.project, contributor: requester})` + bump `quota.yearly[YYYY]` (requester) + bump `quota.supervised[YYYY]` (reviewer) + notif.
5. team_change → mutate `teams.members` + sync team chat group.
6. executive_promotion → `personnel.level := 5` + notif.

### 8.X.2 Teams

Tabel `teams`:

- `id`, `name`, `leader`, `members[]`, `track`, `createdAt`, `cycleYear`, `completed`

Endpoint:

- `GET  /api/mgmt/teams` (filter: leader, member)
- `POST /api/mgmt/teams` (PL3+ same track only; auto create chat group `kind: team`)

### 8.X.3 Quotas

Tabel `mgmt_quotas`:

- `username`, `monthly: { "YYYY-MM": n }`, `yearly: { "YYYY": n }`, `supervised: { "YYYY": n }`

Endpoint: `GET /api/mgmt/quota/:username`

Obligation rules (frontend visualisasi, backend wajib expose count yang akurat):

- PL2: 1 personal submission / bulan
- PL3: 1 team project / tahun
- PL4: 2 supervised approvals / tahun
- PL5/PL6: tidak ada quota wajib
- PL7: dikecualikan dari semua obligation

### 8.X.4 Authorization Caps (baru)

- PL7 tidak boleh memfile transfer request (track-agnostic).
- Clearance ladder otomatis: hanya L1→L4 lewat clearance form. L4→L5 hanya via executive_promotion. L5→L6 dan L6→L7 tidak tersedia di self-service (assignment manual oleh PL7).
- Default registrasi user baru: `level=1, track=executive` (PL1-GOV / Intern).

### 8.X.5 Notifications

Tabel `notifications`:

- `id`, `kind` (info | warning | system | mention | request)
- `title`, `body`, `recipient` (username), `sender`, `link?`, `read`, `createdAt`

Endpoint:

- `GET  /api/notifications?recipient=...`
- `POST /api/notifications` (server-internal pada side effect approval)
- `POST /api/notifications/:id/read`

### 8.X.6 Chat

Tabel `conversations`:

- `id`, `kind` (dm | group | team | division)
- `name`, `members[]`, `linkedTeamId?`, `linkedTrack?`, `createdAt`

Tabel `messages`:

- `id`, `conversationId`, `sender`, `body`, `createdAt`

Endpoint:

- `GET  /api/chat/conversations?member=...`
- `POST /api/chat/conversations` (manual group / DM)
- `GET  /api/chat/conversations/:id/messages`
- `POST /api/chat/conversations/:id/messages`

Auto-sync wajib:

- `team_change` approval → roster `kind: team` di-update.
- `transfer` approval → user dipindah dari `kind: division` lama ke baru.
- `createTeam` → buat conversation `kind: team`.

### 8.X.7 Projects - Archiving & Attribution

Field tambahan pada Project:

- `archived: boolean` (default false)
- `contributor: string` (username submitter; auto-set dari side effect submission_team)

Endpoint patch yang sudah ada (`PUT /api/projects/:id`) wajib mendukung kedua field. Filter list:

- `GET /api/projects?archived=true|false`

## 9. Storage dan Migrasi

Frontend saat ini memakai localStorage keys berikut (untuk referensi migrasi):

1. `morneven_projects`
2. `morneven_characters`
3. `morneven_places`
4. `morneven_technology`
5. `morneven_gallery`
6. `morneven_creatures`
7. `morneven_other`
8. `morneven_map_markers`
9. `morneven_map_image`
10. `morneven_personnel`
11. `morneven_cc_settings`
12. `auth_state`
13. `morneven_news`
14. `morneven_mgmt_requests`
15. `morneven_mgmt_teams`
16. `morneven_mgmt_quotas`
17. `morneven_mgmt_seeded_v1`
18. `morneven_notifications`
19. `morneven_chat_conversations`
20. `morneven_chat_messages`

Backend harus mengganti pola ini menjadi persistence DB + API tanpa mengubah kontrak data frontend.

## 10. Saran Stack Backend

1. Node.js + Express atau NestJS.
2. PostgreSQL (disarankan) atau MongoDB.
3. JWT access token + refresh token.
4. ORM: Prisma/TypeORM.
5. Validation: Zod/Joi/class-validator.
6. Logging: pino/winston.
7. Rate limit + CORS + helmet.

## 11. Checklist Siap Implementasi

1. Definisikan schema DB sesuai section variabel.
2. Implement auth + middleware RBAC (role, level, track).
3. Implement semua endpoint section 5.
4. Implement validasi section 7.
5. Implement ownership rule gallery + moderation rule komentar.
6. Buat test minimal: auth, RBAC, CRUD utama, restricted access.

Dokumen ini menjadi acuan tunggal backend. Jika ada perubahan kontrak frontend, update dokumen ini terlebih dahulu sebelum coding lanjutan.
