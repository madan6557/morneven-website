# Backend Requirement Morneven Institute

Dokumen ini mendeskripsikan kebutuhan endpoint dan struktur backend yang diperlukan agar website Morneven Institute berjalan optimal.

## Endpoint Utama

### 1. Autentikasi
- **POST /api/auth/login**
  - Body: `{ email, password }`
  - Response: `{ token, user }`
- **POST /api/auth/register**
  - Body: `{ name, email, password }`
  - Response: `{ token, user }`
- **GET /api/auth/me**
  - Header: `Authorization: Bearer <token>`
  - Response: `{ user }`

### 2. Karakter
- **GET /api/characters**
  - Response: `[{ id, name, ... }]`
- **GET /api/characters/:id**
  - Response: `{ id, name, ... }`
- **POST /api/characters** (khusus author)
  - Body: `{ name, ... }`
  - Response: `{ id, name, ... }`

### 3. Tempat
- **GET /api/places**
- **GET /api/places/:id**
- **POST /api/places** (khusus author)

### 4. Teknologi
- **GET /api/technology**
- **GET /api/technology/:id**
- **POST /api/technology** (khusus author)

### 5. Proyek
- **GET /api/projects**
- **GET /api/projects/:id**
- **POST /api/projects** (khusus author)

### 6. Galeri
- **GET /api/gallery**
- **GET /api/gallery/:id**
- **POST /api/gallery** (khusus author)

### 7. User Settings
- **GET /api/settings**
- **PATCH /api/settings**

## Catatan
- Semua endpoint POST/PATCH untuk resource utama hanya bisa diakses oleh user dengan role author.
- Semua endpoint GET dapat diakses publik.
- Response mengikuti format JSON.
- Disarankan menggunakan JWT untuk autentikasi.

## Saran Teknologi Backend
- Node.js + Express/NestJS
- MongoDB/PostgreSQL
- JWT Auth
- CORS enabled
