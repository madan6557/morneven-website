# Backend Requirement Morneven Institute

Dokumen ini adalah spesifikasi backend yang disesuaikan dengan fitur frontend saat ini. Tujuannya agar development backend bisa langsung berjalan tanpa ambigu, termasuk kontrak route, logika akses, variabel request/response, validasi, dan format error.

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
- `viewer`
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
    "role": "viewer",
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
  - default role: `viewer`
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

## 5.12 News

### GET /api/news
### POST /api/news
### PUT /api/news/:id
### DELETE /api/news/:id

Write operation disarankan L7 only.

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
    replies: { id: string; author: string; text: string; date: string }[];
  }[];
}
```

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
  role: "author" | "viewer" | "guest";
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

## 8. Logika Bisnis Penting

1. `uploadedBy` pada gallery wajib diisi dari user token saat create.
2. Ownership gallery divalidasi backend (jangan hanya frontend).
3. `author` komentar/reply diambil dari token, bukan request body.
4. Bulk personnel update hanya mengubah field yang dikirim.
5. Semua write endpoint wajib audit trail minimal: `updatedAt`, `updatedBy` (disarankan).
6. Gunakan soft-delete jika dibutuhkan histori moderation.

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
