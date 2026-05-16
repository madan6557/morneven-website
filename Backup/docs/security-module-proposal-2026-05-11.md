# Morneven Security Module Proposal

**Tanggal:** 2026-05-11  
**Status:** Draft untuk review  
**Scope:** Morneven frontend, backend, API, database, storage, realtime, deployment, dan proses operasional  
**Owner yang diusulkan:** Security Manager  
**Nama modul:** Morneven Security Module, disingkat MSM

## 1. Ringkasan

Morneven membutuhkan sistem pertahanan modular yang bisa dikelola, diaudit, dan ditingkatkan tanpa membuat fitur utama menjadi sulit dikembangkan. MSM dirancang sebagai lapisan keamanan lintas ekosistem, bukan sebagai satu middleware besar.

Prinsip utama:

1. Setiap request harus melalui security gateway.
2. Setiap aksi sensitif harus punya autentikasi, otorisasi, audit, dan rate control.
3. Setiap input dianggap tidak dipercaya sampai divalidasi.
4. Setiap file dianggap berbahaya sampai lolos pemeriksaan.
5. Setiap token, secret, dan credential harus punya masa berlaku, rotasi, dan pencabutan.
6. Setiap anomali harus dicatat dengan request id, actor, target, severity, dan action yang diambil.
7. Sistem tidak melakukan serangan balik keluar dari infrastruktur Morneven.

Catatan penting untuk kebutuhan "menyerang balik": MSM tidak boleh melakukan hack-back, DDoS balik, exploit balik, brute force balik, scan balik, atau tindakan ofensif keluar ke sistem pihak lain. Alternatif yang aman dan legal adalah active defense: rate limit, blocklist, denylist sementara, challenge, session revoke, quarantine, honeypot internal, evidence capture, alert, escalation ke provider, dan takedown melalui jalur resmi. Ini menghindari risiko friendly fire, salah atribusi, pelanggaran hukum, dan gangguan ke pihak tidak bersalah.

## 2. Kondisi Saat Ini

Berdasarkan struktur yang ada:

- Backend memakai Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, Zod, Helmet, CORS allowlist, dan express-rate-limit.
- Backend sudah punya `request-id`, global rate limiter, auth rate limiter, validasi body, refresh token hash, JSON body limit 1 MB, health check, readiness check, dan graceful shutdown.
- RBAC sudah ada melalui role, level, dan track: `admin`, `author`, `personel`, `guest`, serta track `executive`, `field`, `mechanic`, `logistics`.
- Upload file sudah dibatasi ukuran lewat `MAX_UPLOAD_MB`, tetapi belum terlihat validasi tipe konten yang kuat, antivirus, magic byte check, hash, atau quarantine.
- Audit log sudah tersedia di Prisma melalui `AuditLog`, tetapi belum menjadi event pipeline keamanan menyeluruh.
- Frontend menyimpan access token dan refresh token di `localStorage`, sehingga risiko XSS berdampak tinggi.
- Deployment memakai pola Railway untuk backend dan Vercel atau Node server untuk frontend.

Baseline ini cukup baik untuk tahap awal, tetapi belum cukup untuk threat model produksi yang kuat.

## 3. Tujuan Keamanan

MSM harus memenuhi tujuan berikut:

| Area | Tujuan |
| --- | --- |
| Availability | Sistem tetap tersedia saat traffic tinggi, abuse, brute force, scraping, dan DDoS level aplikasi. |
| Confidentiality | Token, data user, file, chat, dan konten internal tidak bocor ke role yang salah. |
| Integrity | Data lore, project, management, personnel, chat, gallery, dan setting hanya bisa berubah lewat aksi yang sah. |
| Accountability | Semua aksi penting bisa ditelusuri ke actor, request id, IP, user agent, target, dan waktu. |
| Least privilege | Role hanya punya akses sesuai kebutuhan. Credential sah tidak otomatis bebas dari deteksi anomali. |
| Resilience | Incident bisa dibatasi, dipulihkan, dan diinvestigasi tanpa menghentikan seluruh platform. |

## 4. Threat Model Prioritas

### 4.1 Serangan yang harus ditangani

1. DDoS aplikasi: flood endpoint, brute force login, refresh token spam, upload flood, websocket flood.
2. Injection: SQL injection, NoSQL style abuse pada JSON filter, command injection, path traversal, header injection.
3. XSS: stored XSS di content, reflected XSS dari error, DOM XSS di frontend.
4. CSRF: jika nanti token berpindah ke cookie.
5. Broken access control: akses data atau aksi lintas role, level, track, owner, atau membership.
6. Account takeover: password stuffing, token theft, refresh token reuse, session hijack.
7. File attack: malware upload, polyglot file, MIME spoofing, oversized file, decompression bomb, unsafe public object.
8. Data scraping: enumeration, pagination abuse, excessive export, repeated object reads.
9. Insider misuse: credential valid digunakan di luar scope role atau pola kerja normal.
10. Supply chain: dependency compromise, secret leak, malicious package, CI/CD compromise.
11. Infrastructure abuse: misconfigured CORS, exposed storage, weak Railway/Vercel variables, missing TLS enforcement.

### 4.2 Batas yang tidak dilakukan

MSM tidak akan:

- Mengirim traffic balasan ke attacker.
- Mengeksploitasi sistem attacker.
- Melakukan scanning balik ke IP sumber.
- Mencoba login ke sistem pihak lain.
- Melakukan DDoS balik.
- Mengambil data dari endpoint attacker.

Respons aktif hanya berlaku di dalam kontrol Morneven atau melalui provider resmi.

## 5. Arsitektur Modular

```text
Client
  |
  v
Edge Protection
  |
  v
Security Gateway
  |
  +-- Identity and Session Module
  +-- Request Risk Engine
  +-- Rate Limit and Abuse Control
  +-- Input Validation and Sanitization
  +-- RBAC and Policy Engine
  +-- File Security Module
  +-- Audit and Evidence Module
  +-- Threat Detection Module
  +-- Active Defense Orchestrator
  +-- Observability and Alerting
  |
  v
Domain API Modules
  |
  v
Prisma Data Access Layer
  |
  v
PostgreSQL and Object Storage
```

MSM perlu dibuat sebagai folder backend tersendiri:

```text
morneven-backend/src/security/
  index.ts
  config.ts
  context.ts
  gateway.ts
  policies/
  detectors/
  responders/
  audit/
  rate-limit/
  validation/
  files/
  sessions/
  observability/
  tests/
```

Catatan implementasi: folder detail dibuat saat fase implementasi, bukan sekarang, agar tidak ada folder kosong atau file mati.

## 6. Modul yang Diusulkan

### 6.1 Security Gateway Module

Fungsi:

- Menjadi entrypoint keamanan setelah `request-id` dan sebelum semua route bisnis.
- Membentuk security context per request.
- Menghitung risk score awal.
- Menolak request berbahaya sebelum masuk ke handler domain.

Input:

- `x-request-id`
- IP dari trusted proxy
- User agent
- Method
- Path
- Origin
- Auth status
- User id, username, role, level, track
- Request size
- Content type

Output:

- `req.securityContext`
- Audit event awal untuk request berisiko
- Block, challenge, allow, atau allow with monitoring

Rule awal:

| Kondisi | Action |
| --- | --- |
| Origin tidak masuk allowlist | Block |
| Content-Type tidak sesuai endpoint | Block |
| Body terlalu besar | Block |
| Path traversal pattern | Block |
| Auth endpoint brute force | Delay, rate limit, block sementara |
| Token invalid berulang | Revoke related session jika bisa diidentifikasi |

### 6.2 Identity and Session Module

Fungsi:

- Memperkuat login, refresh token, logout, dan validasi session.
- Mendeteksi refresh token reuse.
- Menyimpan metadata session secara hashed.
- Mendukung revocation per user, per device, atau seluruh akun.

Perubahan yang diusulkan:

1. Tambah tabel `SecuritySession`.
2. Refresh token tetap hashed.
3. Simpan `sessionId` dalam JWT access token.
4. Refresh token rotation harus mematikan token lama.
5. Jika refresh token lama dipakai lagi, revoke seluruh session terkait.
6. Tambahkan `tokenVersion` di user untuk force logout massal.
7. Tambahkan optional MFA untuk `admin`, `author`, dan PL6 ke atas.
8. Ganti token storage frontend dari `localStorage` ke httpOnly secure cookie pada fase produksi, atau terapkan transitional mode dengan Content Security Policy ketat.

Data model awal:

```prisma
model SecuritySession {
  id              String   @id @default(uuid())
  userId          String
  refreshTokenId  String?
  ipHash          String?
  userAgentHash   String?
  riskScore       Int      @default(0)
  revokedAt       DateTime?
  createdAt       DateTime @default(now())
  lastSeenAt      DateTime @default(now())
}
```

Acceptance criteria:

- Login membuat session record.
- Refresh token rotation mengupdate session.
- Reuse token lama membuat audit event severity high.
- Logout bisa revoke satu session atau semua session user.
- Admin dapat melihat session aktif miliknya sendiri dan revoke device.

### 6.3 RBAC and Policy Engine

Fungsi:

- Mengubah otorisasi dari helper tersebar menjadi policy engine yang konsisten.
- Memastikan credential valid tidak berarti bebas akses.
- Menghindari friendly fire dengan memisahkan authorized behavior dan suspicious behavior.

Konsep policy:

```text
subject: user, role, level, track, session risk
action: read, create, update, delete, export, moderate, manage
resource: module, entity type, entity id, owner, sensitivity
context: ip, user agent, time, request rate, payload size
decision: allow, deny, step-up, audit-only
```

Contoh policy:

| Resource | Action | Rule |
| --- | --- | --- |
| News | create/update/delete | PL7 atau PL6 executive |
| Projects | write | PL7 atau PL6 mechanic/executive |
| Lore places/creatures | write | PL7, PL6 executive, atau PL6 field |
| Lore technology | write | PL7, PL6 executive, atau PL6 mechanic |
| Gallery | write | level 6 ke atas dan bukan guest |
| Management | approve/reject | PL7 admin/author sesuai kontrak |
| Security admin | view/respond | Security Manager atau PL7 admin |
| Audit logs | read | Security Manager, PL7 admin, read-only auditor |

Friendly fire prevention:

- Jangan block user hanya karena role tinggi melakukan banyak aksi.
- Bandingkan aksi dengan policy role, endpoint, waktu, dan volume.
- Gunakan step-up verification untuk aksi high risk, bukan langsung ban permanen.
- Jika akun admin melakukan pola tidak biasa, revoke session tertentu, bukan seluruh role admin.

### 6.4 Request Risk Engine

Fungsi:

- Memberi skor risiko per request.
- Menentukan apakah request perlu allow, challenge, throttle, block, atau audit-only.

Faktor risiko:

| Faktor | Contoh |
| --- | --- |
| Identity | guest, unauthenticated, session baru, token baru di IP asing |
| Endpoint | auth, upload, export, admin, management, settings |
| Payload | ukuran besar, pattern injection, HTML/script, file ganda |
| Rate | request per menit, burst, error ratio, 401/403 berulang |
| Network | IP baru, ASN hosting murah, proxy/VPN known bad jika memakai feed provider |
| Device | user agent berubah drastis, fingerprint mismatch |
| History | user pernah kena security event, session pernah fail refresh |

Decision matrix:

| Risk score | Action |
| --- | --- |
| 0 sampai 19 | Allow |
| 20 sampai 39 | Allow plus audit sample |
| 40 sampai 59 | Throttle atau challenge |
| 60 sampai 79 | Block sementara dan alert |
| 80 sampai 100 | Block, revoke session jika relevan, incident high |

### 6.5 Rate Limit and Abuse Control Module

Fungsi:

- Mengontrol traffic per IP, user, route group, token, dan action.
- Mendukung adaptive throttling saat serangan.

Layer:

1. Edge provider: WAF, CDN, bot protection, geo/IP rules.
2. App global limiter: semua request.
3. Route group limiter: auth, files, chat, search/list, export, management.
4. Identity limiter: per user, per session, per role.
5. Mutation limiter: create/update/delete/upload.
6. WebSocket limiter: connect, message, join, typing/presence.

Default proposal:

| Group | Limit awal |
| --- | --- |
| Global API anonymous | 100 request per 15 menit per IP |
| Global API authenticated | 600 request per 15 menit per user |
| Auth login/register/refresh | 5 sampai 10 request per 15 menit per IP dan email hash |
| Upload | 20 upload per jam per user, lebih ketat untuk guest yaitu 0 |
| Chat message | 60 message per menit per user dengan burst 10 |
| Export/extraction | 3 job per jam per eligible user |
| Admin mutation | 60 mutation per 15 menit per user dengan audit penuh |

Respons DDoS aplikasi:

- Naikkan rate limit secara otomatis untuk unauthenticated traffic.
- Prioritaskan user authenticated dengan session sehat.
- Aktifkan degraded mode untuk endpoint berat seperti list besar, upload, export, dan search.
- Return `429` dengan retry window.
- Kirim alert ke Security Manager.
- Eskalasi ke provider edge untuk IP/ASN/country block jika traffic jelas malicious.

### 6.6 Input Validation and Sanitization Module

Fungsi:

- Memastikan semua input tervalidasi dengan schema.
- Memisahkan validasi API, sanitasi HTML, dan policy payload.

Standar:

1. Semua body memakai Zod schema.
2. Semua query param memakai Zod schema.
3. Semua path param memakai schema UUID atau enum.
4. Semua pagination punya `pageSize` maksimum.
5. Semua sort field memakai enum allowlist.
6. Semua URL eksternal divalidasi protokol dan hostname.
7. Semua rich text disanitasi sebelum simpan atau sebelum render.
8. Error response tidak boleh membocorkan stack, SQL, path server, atau secret.

Injection defense:

| Attack | Defense |
| --- | --- |
| SQL injection | Prisma parameterized query, hindari raw query tanpa parameter |
| Path traversal | Normalize path, allowlist folder, tolak `..`, slash ganda, encoded traversal |
| XSS | Sanitasi HTML, CSP, escape output, hindari dangerouslySetInnerHTML |
| Header injection | Normalize header, tolak CRLF |
| JSON abuse | Schema strict, depth limit, array limit |
| Command injection | Tidak menjalankan shell dari input user |

### 6.7 File Security Module

Fungsi:

- Mengamankan upload, download, object storage, dan attachment.

Pipeline upload:

```text
receive multipart
  -> size limit
  -> filename normalize
  -> MIME allowlist
  -> magic byte check
  -> hash SHA-256
  -> malware scan provider
  -> image/video metadata strip jika relevan
  -> quarantine jika gagal
  -> store private object
  -> create file record
  -> return signed/proxied URL
```

Allowlist awal:

| Type | MIME |
| --- | --- |
| Image | image/png, image/jpeg, image/webp |
| Video | video/mp4, video/webm |
| Document | application/pdf |
| Text | text/plain, text/markdown |

Block awal:

- HTML upload.
- SVG upload dari user biasa.
- Executable.
- Archive nested tanpa scanner khusus.
- File dengan MIME tidak cocok magic byte.
- Nama file kosong setelah sanitasi.

Storage policy:

- Object storage default private.
- Public direct URL hanya untuk asset publik yang sudah disetujui.
- API object proxy wajib auth untuk konten internal.
- Set `Content-Disposition: attachment` untuk file yang berisiko render.
- Tambahkan `X-Content-Type-Options: nosniff`.

### 6.8 Audit and Evidence Module

Fungsi:

- Mencatat aksi security dan domain penting secara konsisten.
- Memisahkan audit normal, security event, dan incident.

Event yang wajib dicatat:

- Login success/fail.
- Register.
- Refresh token success/fail/reuse.
- Logout.
- Password change/reset request.
- Role, level, track, dan permission change.
- Management approve/reject.
- Upload, delete file, object access high volume.
- Export/extraction job.
- 401/403 burst.
- Rate limit hit.
- WAF/security gateway block.
- Policy deny.
- Admin access ke audit/security dashboard.

Data minimal:

```text
id
createdAt
requestId
actorId
actorUsername
role
level
track
sessionId
ipHash
userAgentHash
action
resource
resourceId
severity
riskScore
decision
metadata
```

Retention:

| Data | Retention |
| --- | --- |
| Audit normal | 180 hari |
| Security event medium/high | 1 tahun |
| Incident evidence | 2 tahun atau sesuai kebutuhan legal |
| Raw request body | Tidak disimpan kecuali field aman dan sudah direduksi |

### 6.9 Threat Detection Module

Fungsi:

- Mendeteksi pola serangan dan abuse.
- Menghasilkan signal untuk active defense.

Detector awal:

| Detector | Sinyal |
| --- | --- |
| Auth brute force | Banyak login gagal per IP, email hash, atau username |
| Credential stuffing | Banyak email berbeda dari IP/ASN sama |
| Token theft | Refresh token reuse, session pindah fingerprint ekstrem |
| Injection probe | Payload mengandung pattern SQLi/XSS/path traversal |
| Upload abuse | Upload gagal berulang, MIME mismatch, ukuran mendekati limit |
| Scraping | Pagination cepat, object reads banyak, user agent bot |
| Admin anomaly | Aksi admin banyak di luar pola normal |
| WebSocket flood | Connect/message burst, room join abuse |
| Data exfiltration | Export/list/detail high volume dari user atau session |

Severity:

| Severity | Definisi |
| --- | --- |
| Low | Mencurigakan tetapi belum mengganggu |
| Medium | Ada pola abuse terbatas |
| High | Risiko akun, data, atau availability nyata |
| Critical | Incident aktif, data exposure, atau service disruption |

### 6.10 Active Defense Orchestrator

Fungsi:

- Mengambil tindakan defensif otomatis di dalam kontrol Morneven.

Action yang diperbolehkan:

| Action | Kapan dipakai |
| --- | --- |
| Rate limit | Traffic tinggi atau burst |
| Temporary block | IP/session/user melakukan abuse berulang |
| Step-up auth | Credential valid tetapi risk score tinggi |
| Session revoke | Token theft, refresh reuse, device anomaly |
| Account lock sementara | Brute force jelas ke akun tertentu |
| Quarantine upload | File mencurigakan atau scan gagal |
| Degraded mode | Endpoint berat saat DDoS aplikasi |
| Honeypot internal | Endpoint palsu di domain Morneven untuk mendeteksi bot |
| Evidence capture | Simpan event, hash, header aman, dan timeline |
| Provider escalation | Kirim data ke Railway/Vercel/CDN/WAF sesuai prosedur |

Action yang dilarang:

- DDoS balik.
- Scan balik.
- Exploit balik.
- Payload balik.
- Mengambil data dari attacker.
- Mengirim malware atau script ke attacker.

Friendly fire control:

- Setiap action otomatis punya TTL.
- Semua block user authenticated harus bisa direview.
- Role tinggi mendapat step-up sebelum lock kecuali ada bukti token theft.
- Block IP tidak boleh memblokir seluruh kantor atau network internal tanpa approval.
- Allowlist internal tetap diawasi, bukan kebal audit.

### 6.11 Security Admin Console

Fungsi:

- Memberikan Security Manager dashboard untuk melihat, memfilter, dan merespons event.

Fitur:

1. Security overview.
2. Active incidents.
3. Risk event timeline.
4. Session management.
5. Rate limit hits.
6. Blocklist and allowlist.
7. Quarantine files.
8. Audit search.
9. Incident report export.
10. Manual revoke session.
11. Manual unblock with reason.
12. Policy dry-run view.

Access:

- Security Manager.
- PL7 admin.
- Read-only auditor jika dibutuhkan.

Semua aksi console wajib diaudit.

### 6.12 Secrets and Configuration Module

Fungsi:

- Mengelola secret dan security config dengan aman.

Standar:

1. Secret hanya di environment provider, bukan repo.
2. JWT secret minimal 32 bytes random.
3. Access dan refresh secret berbeda.
4. Rotasi secret terjadwal.
5. `CORS_ORIGIN` eksplisit, tanpa wildcard produksi.
6. `NODE_ENV=production` wajib di produksi.
7. Database user least privilege.
8. Storage credential scoped hanya ke bucket/prefix Morneven.
9. Backup code dan credential personal tidak boleh berada di repo.

Catatan risiko: ada file backup code di root workspace. File credential seperti itu harus dipindahkan ke password manager atau vault dan tidak masuk source control.

### 6.13 Observability and Alerting Module

Fungsi:

- Mengubah event keamanan menjadi metrik, log, dan alert yang bisa ditindak.

Metrik wajib:

- Request rate per route group.
- 4xx/5xx rate.
- 401/403/429 rate.
- Login fail/success ratio.
- Refresh token reuse count.
- Upload rejected count.
- File quarantine count.
- Security event severity count.
- P95 latency saat limiter aktif.
- WebSocket connection/message rate.

Alert awal:

| Alert | Trigger |
| --- | --- |
| Auth attack | Login fail tinggi dalam 10 menit |
| DDoS app | Request rate dan 429 naik tajam |
| Token theft | Refresh token reuse lebih dari 0 |
| Upload threat | Malware scan positive atau MIME mismatch burst |
| Admin anomaly | Banyak mutation admin dalam window pendek |
| Data scraping | High volume list/detail/object reads |
| Error spike | 5xx naik tajam setelah security block |

### 6.14 Infrastructure and Edge Security Module

Fungsi:

- Memindahkan sebagian proteksi traffic ke edge agar backend tidak memikul semuanya.

Rekomendasi:

- CDN/WAF di depan frontend dan backend.
- TLS wajib.
- HSTS di production.
- Bot challenge untuk endpoint publik jika diserang.
- IP reputation feed jika tersedia dari provider.
- Request body size limit di edge dan app.
- WAF managed rules untuk SQLi, XSS, LFI/RFI, protocol abuse.
- Origin backend hanya menerima traffic dari edge jika platform memungkinkan.
- Database tidak public, hanya backend runtime.
- Storage bucket private by default.

### 6.15 Frontend Security Module

Fungsi:

- Mengurangi risiko XSS, token theft, dan data leak dari browser.

Rekomendasi:

1. Pindahkan auth token ke httpOnly secure sameSite cookie untuk produksi.
2. Terapkan Content Security Policy.
3. Hilangkan inline script yang tidak perlu.
4. Audit semua tempat render HTML.
5. Sanitasi konten user generated sebelum render.
6. Jangan simpan data sensitif di `localStorage`.
7. Jangan log token, payload auth, atau response sensitif.
8. Tambahkan route guard berdasarkan role/level/track.
9. Tambahkan automatic logout saat session revoke.
10. Validasi upload di frontend sebagai UX, tetapi backend tetap sumber kebenaran.

CSP awal:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
media-src 'self' blob: https:;
connect-src 'self' https://backend.dev.morneven.com wss:;
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
```

Catatan: CSP final perlu disesuaikan dengan domain produksi, analytics, dan asset provider.

### 6.16 Secure Development and CI/CD Module

Fungsi:

- Mencegah vulnerability masuk lewat dependency, secret leak, dan perubahan kode.

Kontrol:

- `npm audit` atau tool SCA di CI.
- Secret scanning.
- Dependency pinning dan lockfile review.
- TypeScript build wajib.
- Lint wajib.
- Unit test untuk policy dan detector.
- Integration test untuk auth, RBAC, upload, rate limit.
- SAST untuk backend dan frontend jika tersedia.
- PR checklist security untuk route baru.
- Migration review untuk tabel sensitif.

Security checklist route baru:

1. Auth required atau public jelas.
2. RBAC policy jelas.
3. Zod body/query/params.
4. Rate limit group.
5. Audit event untuk mutation.
6. Pagination limit untuk list.
7. Error tidak leak detail internal.
8. Test positive dan negative.

## 7. Data Model Tambahan

Model awal yang diusulkan:

```prisma
model SecurityEvent {
  id             String   @id @default(uuid())
  requestId      String?
  actorId        String?
  actorUsername  String?
  sessionId      String?
  ipHash         String?
  userAgentHash  String?
  action         String
  resource       String?
  resourceId     String?
  severity       String
  riskScore      Int      @default(0)
  decision       String
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())
}

model SecurityBlock {
  id          String   @id @default(uuid())
  subjectType String
  subjectHash String
  reason      String
  severity    String
  expiresAt   DateTime
  createdBy   String?
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
  revokeReason String?
}

model SecurityPolicy {
  id          String   @id @default(uuid())
  key         String   @unique
  description String
  enabled     Boolean  @default(true)
  config      Json     @default("{}")
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FileScanRecord {
  id          String   @id @default(uuid())
  objectPath  String
  sha256      String
  mime        String
  size        Int
  verdict     String
  provider    String?
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())
}
```

Data privacy:

- IP dan user agent disimpan sebagai hash dengan pepper dari environment.
- Metadata tidak boleh menyimpan password, token, secret, full Authorization header, atau file content.

## 8. API Internal yang Diusulkan

Endpoint security admin:

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/api/security/events` | List event dengan filter |
| GET | `/api/security/events/:id` | Detail event |
| GET | `/api/security/incidents` | List incident aktif |
| POST | `/api/security/incidents/:id/ack` | Acknowledge incident |
| GET | `/api/security/sessions` | List session user sendiri atau admin scope |
| POST | `/api/security/sessions/:id/revoke` | Revoke session |
| GET | `/api/security/blocks` | List block aktif |
| POST | `/api/security/blocks` | Manual block |
| POST | `/api/security/blocks/:id/revoke` | Manual unblock |
| GET | `/api/security/quarantine` | List file quarantine |
| POST | `/api/security/quarantine/:id/release` | Release file setelah review |
| POST | `/api/security/quarantine/:id/delete` | Delete file quarantine |
| GET | `/api/security/policies` | List policy |
| PATCH | `/api/security/policies/:key` | Update policy config |

Semua endpoint di atas harus:

- Auth required.
- Policy `security.manage` atau `security.read`.
- Audit penuh.
- Rate limit admin.
- Redact metadata sensitif.

## 9. Incident Response Playbook

### 9.1 DDoS aplikasi

1. Konfirmasi request rate, 429, latency, CPU/memory, dan route target.
2. Aktifkan stricter limiter untuk anonymous traffic.
3. Aktifkan degraded mode untuk upload, export, search, dan list berat.
4. Prioritaskan authenticated traffic.
5. Push block sementara untuk IP/ASN yang jelas malicious.
6. Eskalasi ke edge provider untuk WAF rule.
7. Buat incident record dan timeline.
8. Setelah stabil, turunkan rule bertahap dan review false positive.

### 9.2 Injection attempt

1. Block request yang match high confidence pattern.
2. Catat payload yang sudah direduksi, request id, actor, path, dan risk score.
3. Jika user authenticated, cek apakah aksi sesuai role.
4. Untuk user biasa, throttle atau revoke session jika pola berulang.
5. Untuk admin, step-up auth dan alert Security Manager.
6. Review endpoint target dan tambahkan test regresi.

### 9.3 Account takeover

1. Deteksi refresh token reuse, login anomali, atau session fingerprint mismatch.
2. Revoke session terkait.
3. Jika high confidence, revoke semua session user.
4. Paksa password reset dan MFA enrollment untuk role tinggi.
5. Audit aksi terakhir dari akun tersebut.
6. Rollback perubahan berbahaya jika ada.
7. Buat incident report.

### 9.4 Malicious upload

1. Quarantine file.
2. Jangan kirim URL publik.
3. Catat hash, MIME, ukuran, uploader, dan verdict.
4. Revoke atau throttle user jika pola berulang.
5. Delete file setelah review jika confirmed malicious.
6. Tambahkan signature atau allowlist rule baru.

### 9.5 Insider misuse

1. Cek apakah aksi melanggar policy atau hanya anomali volume.
2. Gunakan audit trail untuk timeline.
3. Jangan langsung memblokir role global.
4. Revoke session spesifik jika diperlukan.
5. Eskalasi ke owner organisasi.
6. Simpan evidence dengan metadata minimum.

## 10. Rencana Implementasi Bertahap

### Phase 0: Review dan keputusan desain

Output:

- Review proposal ini.
- Tentukan role Security Manager di schema.
- Tentukan provider edge/WAF.
- Tentukan apakah produksi akan memakai httpOnly cookie.
- Tentukan retention audit dan legal policy.

Acceptance criteria:

- Tidak ada perubahan kode produksi sebelum desain disetujui.
- Semua keputusan blocker tercatat.

### Phase 1: Security foundation

Scope:

- `src/security/context.ts`
- `src/security/gateway.ts`
- request security context
- query/path schema validation helper
- audit event wrapper
- route group limiter
- base security config

Acceptance criteria:

- Semua request punya security context.
- Semua route group punya limiter.
- Event 401/403/429 tercatat.
- Test middleware positif dan negatif.

### Phase 2: Session hardening

Scope:

- Session model.
- JWT `sessionId`.
- Refresh token reuse detection.
- Session revoke endpoint.
- Password change revoke all sessions.

Acceptance criteria:

- Refresh token reuse membuat event high dan revoke session.
- User bisa logout session.
- Admin/security bisa revoke session sesuai policy.

### Phase 3: Policy engine

Scope:

- Central policy engine.
- Migrasi helper RBAC kritikal.
- Policy tests untuk news, project, lore, gallery, management, files, security.

Acceptance criteria:

- Tidak ada route mutation tanpa policy.
- Test deny untuk role salah.
- Test allow untuk role benar.

### Phase 4: File security

Scope:

- MIME allowlist.
- Magic byte validation.
- SHA-256 hash.
- File scan provider abstraction.
- Quarantine flow.
- Private object default.

Acceptance criteria:

- MIME spoofing ditolak.
- File executable ditolak.
- Quarantine tidak menghasilkan URL publik.
- Upload valid tetap berjalan.

### Phase 5: Threat detection and active defense

Scope:

- Detector brute force, injection probe, upload abuse, scraping, token theft.
- Active defense action dengan TTL.
- Blocklist/allowlist internal.
- Security event severity.

Acceptance criteria:

- Detector menghasilkan event dengan risk score.
- Block otomatis punya TTL dan bisa direvoke.
- Tidak ada outbound retaliation.
- False positive bisa diaudit dan dibatalkan.

### Phase 6: Security admin console

Scope:

- Backend security endpoints.
- Frontend security dashboard.
- Session management.
- Blocklist/quarantine management.
- Incident detail.

Acceptance criteria:

- Security Manager bisa melihat event dan merespons.
- Semua aksi dashboard masuk audit.
- Metadata sensitif tidak tampil.

### Phase 7: Edge and production hardening

Scope:

- WAF/CDN rules.
- HSTS.
- CSP final.
- Secure cookie migration.
- Provider alert integration.
- Backup and restore drill.

Acceptance criteria:

- Production security headers valid.
- Token tidak lagi bergantung pada localStorage untuk produksi.
- DDoS app drill lolos.
- Incident drill menghasilkan report.

## 11. Test Strategy

Unit test:

- Risk scoring.
- Policy decision.
- Detector pattern.
- Rate limit key generation.
- File MIME/magic byte validation.
- Redaction.

Integration test:

- Login brute force.
- Refresh token reuse.
- Role deny/allow.
- Upload valid dan invalid.
- Object path traversal.
- 429 response.
- Security event creation.

Manual security QA:

- XSS payload pada field konten.
- SQLi payload pada query/list/search.
- Path traversal pada object path.
- Large body request.
- Repeated auth failure.
- Multiple session revoke.
- Quarantine workflow.

Non-functional:

- Load test normal.
- Load test degraded mode.
- Alert delivery test.
- Backup restore test.

## 12. Definition of Done

MSM dianggap production-ready jika:

1. Semua route publik dan private melewati security gateway.
2. Semua mutation punya policy dan audit.
3. Auth brute force, token reuse, upload abuse, dan injection probe terdeteksi.
4. Active defense bekerja tanpa outbound retaliation.
5. Session bisa direvoke.
6. File upload punya allowlist, magic byte check, hash, dan quarantine.
7. Security dashboard bisa dipakai Security Manager.
8. Alert high/critical terkirim.
9. Test security utama masuk CI.
10. Dokumentasi operasi dan incident playbook selesai.

## 13. Open Questions untuk Review

1. Apakah role `Security Manager` akan menjadi role baru di Prisma, atau permission khusus untuk PL7 admin tertentu?
2. Provider edge/WAF apa yang akan dipakai untuk produksi?
3. Apakah token produksi akan dipindah ke httpOnly cookie pada implementasi pertama atau fase lanjutan?
4. Apakah MFA wajib untuk semua PL6 ke atas atau hanya PL7 dan Security Manager?
5. Berapa retention legal untuk security event dan audit log?
6. Apakah upload file perlu antivirus provider eksternal sejak phase 4, atau cukup provider abstraction dulu?
7. Apakah security dashboard harus berada di frontend utama atau dashboard admin terpisah?
8. Apakah ada network internal kantor yang perlu allowlist dengan monitoring khusus?

## 14. Risiko Implementasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| False positive memblokir personel sah | Workflow terganggu | Step-up auth, TTL block, audit review, unblock cepat |
| Security module terlalu besar | Sulit dirawat | Implementasi phased dan folder modular |
| Token migration memengaruhi frontend | Login bisa terganggu | Transitional mode dan test end-to-end |
| File scanner lambat | Upload latency naik | Async scan, quarantine, batas ukuran |
| WAF rule terlalu agresif | Request sah diblokir | Dry-run mode sebelum enforce |
| Audit log tumbuh besar | Storage mahal | Retention, indexing, archival |
| Secret lama bocor | Account takeover | Secret rotation dan forced session revoke |

## 15. Keputusan Teknis yang Direkomendasikan

1. Pakai active defense defensif, bukan hack-back.
2. Jadikan `src/security/` sebagai batas modul keamanan backend.
3. Tambahkan policy engine sebelum menambah fitur security dashboard.
4. Prioritaskan session hardening dan refresh token reuse detection.
5. Pindahkan token produksi ke httpOnly cookie setelah CSRF strategy siap.
6. Terapkan file quarantine sebelum membuka upload lebih luas.
7. Pakai edge WAF untuk DDoS dan managed injection rules.
8. Jadikan audit event sebagai sumber data utama incident response.
9. Semua block otomatis harus punya TTL dan reason.
10. Semua aksi Security Manager harus diaudit.

## 16. Catatan Final

MSM harus diperlakukan sebagai sistem pertahanan berlapis. Tujuan utamanya bukan membuat satu mekanisme yang keras di semua tempat, tetapi membuat keputusan keamanan yang presisi: request sah tetap berjalan sesuai role, serangan dibatasi secepat mungkin, dan setiap tindakan bisa diaudit.

Proposal ini siap direview. Revisi yang paling penting sebelum implementasi adalah keputusan role Security Manager, provider WAF, strategi cookie/token, dan retention audit.
