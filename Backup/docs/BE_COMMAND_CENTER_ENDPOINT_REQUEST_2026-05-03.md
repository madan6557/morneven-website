# Backend Request: Command Center Aggregate Endpoint

Date: 2026-05-03
Requester: Frontend
Target: Backend Development
Priority: P1 for FE REST integration QA

## Background

Frontend Home menampilkan Command Center yang dikonfigurasi oleh author. Section yang dapat tampil saat ini:

- Stats cards
- Project Status
- News Feed
- Key Personnel
- Key Locations
- Technology
- Recent Gallery

Sebelumnya FE memerlukan beberapa endpoint sekaligus untuk membangun halaman ini, termasuk stats, settings, projects, news, lore categories, dan gallery. Pola itu tidak ideal karena Home menjadi terlalu banyak request saat pertama kali dibuka.

Keputusan terbaru: gabungkan `content-stats` ke dalam satu endpoint Command Center. FE hanya akan memanggil satu endpoint agregat untuk Home.

## Requested Endpoint

Implementasikan satu endpoint agregat:

```http
GET /api/command-center
```

Jika backend masih menjaga compatibility prefix, endpoint berikut juga boleh tersedia:

```http
GET /v1/command-center
```

Endpoint ini protected dan memakai token yang sama dengan endpoint REST lain:

```http
Authorization: Bearer <token>
```

## Response Contract

Gunakan response envelope standar backend.

```json
{
  "success": true,
  "data": {
    "settings": {
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
    },
    "stats": {
      "totalProjects": 3,
      "activeProjects": 1,
      "totalLore": 18,
      "totalGallery": 24
    },
    "sections": {
      "projects": [],
      "news": [],
      "characters": [],
      "places": [],
      "technology": [],
      "gallery": []
    }
  }
}
```

Semua root field wajib tersedia:

- `settings`
- `stats`
- `sections`

Jika sebuah section tidak aktif atau tidak punya data, kirim array kosong.

## Settings Contract

`settings` adalah konfigurasi author untuk Command Center.

Boolean flags menentukan section yang tampil:

- `showStats`
- `showProjects`
- `showNews`
- `showCharacters`
- `showPlaces`
- `showTechnology`
- `showGallery`
- `showQuickActions`

`welcomeMessage` adalah teks sambutan setelah nama user.

`itemLimits` menentukan jumlah item auto yang dikirim ketika `manualSelections[section]` kosong.

`manualSelections` menentukan ID item yang dipilih author. Jika array tidak kosong, backend harus:

- mengambil hanya ID tersebut,
- menjaga urutan sesuai array,
- mengabaikan `itemLimits` untuk section itu,
- tetap menerapkan visibility dan permission user.

## Stats Contract

`stats.totalProjects`

Jumlah project visible untuk user saat ini. Exclude deleted records.

`stats.activeProjects`

Jumlah project visible untuk user saat ini dengan status aktif. Untuk kontrak FE sekarang, status aktif adalah `On Progress`. Jika backend memakai enum internal, mohon mapping ke definisi ini.

`stats.totalLore`

Jumlah lore visible untuk user saat ini. FE membutuhkan gabungan dari kategori berikut:

- Characters
- Places
- Technology
- Creatures
- Others
- Events

Exclude deleted records.

`stats.totalGallery`

Jumlah gallery item visible untuk user saat ini. Exclude deleted records.

Semua value stats wajib number dan tidak boleh `null`.

## Sections Contract

`sections.projects`

Array item project yang siap render di Home. Minimal field FE:

- `id`
- `title`
- `status`
- `shortDesc`
- `thumbnail`

`sections.news`

Array news item yang siap render di Home. Minimal field FE:

- `id`
- `text`
- `date`
- `hasDetail`
- `thumbnail`

`sections.characters`

Array character item yang siap render di Home. Minimal field FE:

- `id`
- `name`
- `race`
- `accentColor`
- `thumbnail`
- `shortDesc`

`sections.places`

Array place item yang siap render di Home. Minimal field FE:

- `id`
- `name`
- `type`
- `thumbnail`
- `shortDesc`

`sections.technology`

Array technology item yang siap render di Home. Minimal field FE:

- `id`
- `name`
- `category`
- `thumbnail`
- `shortDesc`

`sections.gallery`

Array gallery item yang siap render di Home. Minimal field FE:

- `id`
- `title`
- `type`
- `thumbnail`
- `caption`
- `tags`
- `date`

Backend boleh mengirim field tambahan sesuai model existing. FE akan mengabaikan field yang tidak dipakai.

## Data Resolution Rules

Untuk setiap section:

1. Jika `showX` false, kirim array kosong.
2. Jika `manualSelections[section]` berisi ID, kirim item sesuai ID dan urutan tersebut.
3. Jika `manualSelections[section]` kosong, kirim latest atau default ordered items sesuai `itemLimits[section]`.
4. Terapkan permission dan visibility user sebelum item dikirim.
5. Jangan kirim item deleted.

Default order yang disarankan:

- Projects: latest updated atau priority dashboard order
- News: newest first
- Characters: author selected order, fallback name ascending atau featured order
- Places: author selected order, fallback name ascending atau featured order
- Technology: author selected order, fallback name ascending atau featured order
- Gallery: newest first

## Performance Requirement

Home harus cukup memakai satu request untuk data Command Center.

Endpoint ini sebaiknya melakukan query aggregate dan section fetch di backend, lalu mengirim payload final yang siap render. Jangan minta FE menghitung stats dari banyak list endpoint.

Caching optional boleh dipakai 30 sampai 60 detik per user atau role jika sesuai dengan model permission backend.

## Error Contract

Gunakan pola error standar backend.

```json
{
  "success": false,
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED"
}
```

Expected status:

- `401` jika token missing atau invalid
- `403` jika user tidak punya akses melihat Command Center
- `500` untuk internal backend error

## FE Usage

FE akan memanggil endpoint ini melalui service:

```ts
apiRequest<CommandCenterSnapshot>("/command-center")
```

FE tidak akan memanggil banyak endpoint list untuk membangun Home. Jika endpoint belum tersedia, Home akan kosong untuk data remote agar tidak terjadi request fanout.

Endpoint lama `GET /api/content-stats` tidak lagi dibutuhkan untuk Home jika `GET /api/command-center` sudah membawa `stats`.

## QA Acceptance Criteria

- `GET /api/command-center` tidak `404`.
- Request berhasil untuk akun seed author:
  - Email: `author@morneven.com`
  - Password: `SeedPassword123`
- Response memakai envelope `success/data`.
- `data.settings`, `data.stats`, dan `data.sections` selalu tersedia.
- Semua value stats berupa number.
- Section yang hidden dikirim sebagai array kosong.
- Manual selections menjaga urutan item sesuai konfigurasi author.
- Home Command Center hanya menghasilkan satu request untuk data dashboard.
- Endpoint tidak mengembalikan pagination payload untuk section Home.
- CORS mengizinkan origin FE development dan deployment:
  - `http://localhost:3000`
  - `http://localhost:5173`
  - `https://morneven.com`

## Smoke Test

```powershell
$base = "https://backend.dev.morneven.com/api"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"author@morneven.com","password":"SeedPassword123"}'
$token = $login.data.token
Invoke-RestMethod -Method Get -Uri "$base/command-center" -Headers @{ Authorization = "Bearer $token" }
```

