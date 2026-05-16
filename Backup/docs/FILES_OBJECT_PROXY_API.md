# File Object Proxy API Documentation

## Overview

Endpoint proxy untuk mengakses file object dari private storage (S3/GCS/Local) dengan autentikasi JWT. FE tidak perlu akses langsung ke storage URL; semua traffic file melalui backend yang ter-autentikasi.

---

## Endpoint

### GET `/api/files/object`

Fetch file object binary dengan metadata HTTP yang sesuai.

**Base URL:** `https://morneven-backend-development.up.railway.app`

**Alternate versioning:** `/v1/files/object` (sama)

---

## Authentication

**Required:** `Authorization: Bearer <JWT_TOKEN>`

- Token diperoleh dari `/api/auth/login`
- Endpoint ini protected — request tanpa token akan return `401 Unauthorized`

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | ✅ Yes | Object path dalam storage. Format: `folder/name-uuid-filename.ext`. Max 2048 chars. |
| `download` | string | ❌ No | Jika `true` atau `1`, set header `Content-Disposition: attachment`. Default: inline preview. |

### Path Format & Allowed Folders

Path harus dimulai dengan salah satu root folder yang diizinkan:

- `chat/` — attachment dalam chat messages
- `gallery/` — galeri image/media
- `lore/` — lore content
- `projects/` — project assets
- `news/` — news media
- `map/` — map resources
- `exports/` — data export files
- `uploads/` — general uploads

**Contoh path valid:**
- `chat/1714739200000-uuid-image.png`
- `gallery/photo-xyz.jpg`
- `uploads/document.pdf`

**Path invalid (akan return 400):**
- `../etc/passwd` — path traversal
- `/absolute/path` — absolute path
- `secret/file` — folder tidak di-whitelist
- `` — empty path

---

## Response

### Success (200 OK)

**Headers:**
```
Content-Type: <MIME_TYPE_DARI_FILE>
Content-Length: <UKURAN_BYTES>
Cache-Control: private, max-age=60
ETag: <HASH_OBJECT>
Last-Modified: <RFC_2822_TIMESTAMP>
Content-Disposition: [attachment; filename="..."] (jika download=true)
```

**Body:** Binary file content

**Contoh Response Headers (image):**
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 45678
Cache-Control: private, max-age=60
ETag: "abc123def456"
Last-Modified: Wed, 03 May 2026 10:30:00 GMT
```

### Errors

#### 400 Bad Request — Invalid Path

```json
{
  "success": false,
  "error": {
    "message": "Invalid object path",
    "code": "VALIDATION_ERROR",
    "details": { /* validation details */ }
  }
}
```

**Penyebab:**
- Path traversal detected
- Path terlalu panjang (> 2048 chars)
- Root folder tidak di-whitelist
- Path tidak aman (contains `..`, `.`, atau backslash)

#### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "Missing token",
    "code": "UNAUTHORIZED"
  }
}
```

**Penyebab:**
- Header `Authorization` tidak dikirim
- Token invalid atau expired

#### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "File not found",
    "code": "NOT_FOUND"
  }
}
```

**Penyebab:**
- Object tidak ada di storage
- Path sudah dihapus

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Storage read failed",
    "code": "STORAGE_ERROR",
    "details": "Error message from storage driver"
  }
}
```

---

## Usage Examples

### JavaScript / React

#### Fetch dengan fallback

```javascript
async function loadFileProxy(objectPath, token) {
  try {
    const url = new URL('/api/files/object', 'https://morneven-backend-development.up.railway.app');
    url.searchParams.append('path', objectPath);
    
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.blob();
  } catch (error) {
    console.error('Failed to load file:', error);
    throw error;
  }
}

// Usage: Render image
async function renderChatAttachment(attachment, token) {
  if (!attachment.objectPath) return null;

  try {
    const blob = await loadFileProxy(attachment.objectPath, token);
    const url = URL.createObjectURL(blob);
    return <img src={url} alt="attachment" />;
  } catch (error) {
    // Fallback ke URL langsung (untuk public bucket)
    return <img src={attachment.url} alt="attachment" />;
  }
}
```

#### Download file

```javascript
async function downloadFile(objectPath, token, filename) {
  const url = new URL('/api/files/object', 'https://morneven-backend-development.up.railway.app');
  url.searchParams.append('path', objectPath);
  url.searchParams.append('download', 'true');

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
```

### cURL

#### Preview image inline

```bash
curl "https://morneven-backend-development.up.railway.app/api/files/object?path=chat%2F1714739200000-uuid-image.png" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o downloaded_image.png
```

#### Download dengan Content-Disposition attachment

```bash
curl "https://morneven-backend-development.up.railway.app/api/files/object?path=chat%2F1714739200000-uuid-image.png&download=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -O
```

### Postman

1. **Method:** `GET`
2. **URL:** 
   ```
   https://morneven-backend-development.up.railway.app/api/files/object?path=chat%2F1714739200000-uuid-image.png
   ```
3. **Headers Tab:**
   - Header Name: `Authorization`
   - Value: `Bearer <YOUR_TOKEN>`
4. **Send**

---

## Integration dengan Chat Messages

### API Response dari GET `/api/chat/conversations/:id/messages`

Setiap message object yang punya attachment akan include:

```json
{
  "id": "msg-123",
  "conversationId": "conv-123",
  "author": "m.varga",
  "text": "Check this image",
  "attachments": [
    {
      "objectPath": "chat/1714739200000-uuid-image.png",
      "proxyUrl": "/api/files/object?path=chat%2F1714739200000-uuid-image.png",
      "url": "/api/files/object?path=chat%2F1714739200000-uuid-image.png",
      "src": "/api/files/object?path=chat%2F1714739200000-uuid-image.png",
      "thumbnailUrl": "/api/files/object?path=chat%2F1714739200000-uuid-image.png",
      "contentType": "image/jpeg",
      "size": 45678
    }
  ],
  "createdAt": "2026-05-03T10:30:00.000Z"
}
```

### FE Implementation

```javascript
// Simple attachment renderer
function ChatAttachment({ attachment, token }) {
  const [error, setError] = useState(false);

  if (error || !attachment.objectPath) {
    // Fallback ke URL langsung (public bucket)
    if (attachment.url && !attachment.url.includes('/api/files/object')) {
      return <img src={attachment.url} alt="attachment" />;
    }
    return <p>Failed to load attachment</p>;
  }

  // Construct full proxy URL
  const baseUrl = 'https://morneven-backend-development.up.railway.app';
  const proxyUrl = `${baseUrl}${attachment.proxyUrl}`;

  return (
    <img
      src={proxyUrl}
      alt="attachment"
      onError={() => setError(true)}
      // Browser akan otomatis send Authorization header dari fetch/XHR config global
    />
  );
}
```

---

## Security Notes

1. **Path Validation Ketat:**
   - Root folder harus di-whitelist
   - Blok path traversal (`..`, `.`, backslash)
   - Max path length 2048 chars

2. **Authentication Required:**
   - Semua request wajib punya JWT token valid
   - Token di-verify server-side

3. **Storage Driver Agnostic:**
   - Apakah bucket public atau private di S3/GCS, endpoint ini selalu authentic
   - Ini memastikan akses ke private bucket tetap aman

4. **Cache Headers:**
   - `Cache-Control: private, max-age=60` — cache hanya client, 60 detik
   - Cocok untuk attachment yang jarang berubah

---

## Migration dari Direct Storage URL

### Sebelum (Direct URL — Private Bucket = Error)

```javascript
// ❌ Tidak bisa load dari private bucket
const imageUrl = 'https://t3.storageapi.dev/bucket/chat/image.png';
<img src={imageUrl} /> // 403 AccessDenied
```

### Sesudah (Proxy URL — Selalu Berhasil)

```javascript
// ✅ Selalu bisa load — auth dijamin backend
const imageUrl = 'https://morneven-backend-development.up.railway.app/api/files/object?path=chat%2Fimage.png';
<img src={imageUrl} headers={{ Authorization: `Bearer ${token}` }} />

// Atau pakai payload API yang sudah normalized
const attachment = message.attachments[0];
<img src={attachment.url} /> // URL sudah benar-benar /api/files/object
```

---

## Rate Limiting

File proxy endpoint memakai rate limit standard backend:
- Default: ~100 req/sec per IP (sesuai env RATE_LIMIT_MAX)
- Jika limit terlampaui: `429 Too Many Requests`

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token missing/invalid | Pastikan kirim `Authorization: Bearer <token>` |
| 400 Invalid path | Path traversal atau folder tidak whitelisted | Gunakan path dari API response (sudah normalized) |
| 404 Not Found | File dihapus/tidak ada | File mungkin sudah di-delete, cek payload message |
| 500 Storage error | Storage driver error | Cek logs backend, pastikan bucket accessible |
| Slow response | Network/storage latency | Normal untuk file besar; pertimbangkan CDN layer |

---

## Changelog

**v1 (2026-05-03)**
- Initial release
- Support local, S3, GCS storage drivers
- Authenticated access dengan JWT
- Path validation + whitelist folder
- Metadata headers (ETag, Last-Modified, etc)
