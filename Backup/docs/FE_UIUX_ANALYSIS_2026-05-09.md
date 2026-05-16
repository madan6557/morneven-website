# Frontend UI/UX Analysis Report

Tanggal: 2026-05-09
Project: Morneven Institute Website
Reviewer role: UI/UX Manager

## Scope

Analisis ini fokus pada tampilan frontend, hierarki visual, navigasi, state handling, aksesibilitas dasar, dan readiness mobile.

Metode yang dipakai:
- Review source pada halaman dan layout utama.
- Build production lokal dengan `npm run build`.
- Preview lokal pada `http://127.0.0.1:4173`.
- Inspeksi visual runtime pada desktop default dan viewport mobile `390x844`.

Catatan validasi:
- Build berhasil.
- Backend tidak merespons dari environment audit ini, sehingga beberapa area hanya bisa diverifikasi dalam state gagal fetch atau state kosong.
- Keterbatasan ini justru memperlihatkan kualitas fallback UI saat data tidak tersedia.

## Executive Summary

Frontend Morneven sudah punya identitas visual yang kuat dan cukup konsisten. Arah art style sci-fi HUD terbaca jelas, terutama pada landing, sidebar, card shell, dan peta.

Masalah utama saat ini bukan pada brand direction, tetapi pada usability:
- mobile landing terlalu berat dan CTA utama turun terlalu jauh,
- state kosong dan state error hampir tidak dibedakan,
- keterbacaan teks kecil pada dark UI masih lemah,
- beberapa affordance penting di mobile dan accessibility belum cukup jelas,
- ada area interaktif yang terlihat aktif tetapi belum benar-benar berfungsi.

Secara prioritas, produk ini perlu dibenahi pada resilience UX dan clarity sebelum dilakukan polesan visual lanjutan.

## Findings

### 1. Mobile landing kehilangan orientasi dan CTA utama tidak langsung terbaca

Severity: High

Temuan:
- Navigasi section hanya muncul di desktop, lalu hilang total di mobile tanpa pengganti.
- Hero memakai `min-h-screen` dan spacing besar, sehingga CTA utama terdorong ke bawah pada viewport kecil.
- Pada runtime mobile, teks deskripsi dan CTA bawah terlihat terlalu redup terhadap background gelap.

Evidence:
- `src/pages/Landing.tsx:55-59`
- `src/pages/Landing.tsx:70`
- `src/pages/Landing.tsx:109-129`

Impact:
- Pengguna mobile tidak punya jalur cepat ke section `About`, `Features`, dan `Community`.
- First impression tetap kuat secara visual, tetapi tidak cepat mengarahkan tindakan.
- Risiko bounce lebih tinggi karena hero lebih terasa seperti poster dibanding entry point produk.

Recommendation:
- Tambahkan mobile navigation atau section quick links.
- Kurangi tinggi visual hero pada mobile agar CTA primer dan sekunder muncul lebih awal.
- Naikkan kontras body copy dan secondary CTA pada landing mobile.

### 2. Empty state dan error state tidak dibedakan dengan jelas

Severity: High

Temuan:
- `HomePage` mengubah semua section menjadi kosong saat request gagal, tetapi tidak memberi pesan bahwa masalahnya adalah koneksi atau backend.
- `ProjectsPage` tidak menangani request failure secara eksplisit, sehingga user berpotensi melihat tampilan seperti "memang tidak ada data".
- Pada runtime audit, console menampilkan `TypeError: Failed to fetch` sementara UI hanya tampak kosong atau minim feedback.

Evidence:
- `src/pages/HomePage.tsx:73-97`
- `src/pages/HomePage.tsx:146-358`
- `src/pages/ProjectsPage.tsx:38-57`
- `src/pages/ProjectsPage.tsx:98-103`

Impact:
- User tidak bisa membedakan "belum ada konten", "filter tidak cocok", dan "sistem gagal memuat data".
- Dashboard terasa rusak diam-diam karena panel tetap muncul tetapi isinya kosong.
- Troubleshooting jadi lebih sulit bagi tim operasional maupun user biasa.

Recommendation:
- Pisahkan state `loading`, `empty`, dan `error` secara eksplisit di semua halaman data.
- Untuk dashboard, tampilkan panel placeholder yang memberi status, bukan card kosong tanpa isi.
- Tambahkan action seperti `Retry`, `Reload`, atau pesan status koneksi.

### 3. Readability dark UI masih terlalu rapat dan terlalu kecil untuk penggunaan mobile

Severity: Medium-High

Temuan:
- Sistem tipografi banyak memakai `text-[9px]`, `text-[10px]`, `text-xs`, uppercase, dan letter spacing lebar.
- Memang sudah ada legibility pass di CSS, tetapi pada runtime mobile informasi sekunder tetap tampak tipis dan cepat melelahkan.
- Problem paling terasa di label stat, metadata card, tab/filter, dan helper copy.

Evidence:
- `src/index.css:140-146`
- `src/pages/HomePage.tsx:151-201`
- `src/pages/HomePage.tsx:255-263`
- `src/pages/ProjectsPage.tsx:73-95`
- `src/pages/MapPage.tsx:61-67`

Impact:
- UI terlihat stylish, tetapi biaya baca tinggi.
- Informasi penting berubah menjadi "ornamen teknis", bukan konten yang mudah dipindai.
- Di mobile, detail metadata cepat hilang dalam noise visual.

Recommendation:
- Naikkan ukuran minimum label operasional dan metadata.
- Kurangi uppercase penuh untuk teks sekunder yang perlu dibaca cepat.
- Bedakan level informasi dengan weight, spacing, dan contrast, bukan hanya ukuran kecil.

### 4. Peta interaktif belum mobile-friendly secara interaksi

Severity: Medium-High

Temuan:
- Interaksi pan hanya mengandalkan event mouse.
- Tidak ada handler touch atau gesture khusus untuk perangkat mobile.
- Copy pada halaman menginstruksikan drag/click, tetapi implementasi belum memberi pengalaman sentuh yang setara.

Evidence:
- `src/pages/MapPage.tsx:41-48`
- `src/pages/MapPage.tsx:80-86`
- `src/pages/MapPage.tsx:56`

Impact:
- Di mobile, area ini berisiko terasa pasif atau setengah berfungsi.
- Halaman peta kehilangan value utamanya justru pada device yang paling membutuhkan interaksi sederhana.

Recommendation:
- Tambahkan touch pan support.
- Evaluasi pinch-to-zoom atau fallback zoom interaction yang lebih natural di mobile.
- Tambahkan hint visual saat tidak ada marker atau saat map masih placeholder.

### 5. Ada affordance interaktif yang terlihat aktif tetapi belum siap dipakai

Severity: Medium

Temuan:
- Social links pada landing masih memakai `"#"` namun ditampilkan seperti CTA eksternal aktif.
- Ini membangun ekspektasi yang tidak terpenuhi.

Evidence:
- `src/pages/Landing.tsx:38-42`
- `src/pages/Landing.tsx:242-258`

Impact:
- Menurunkan trust karena user mengira akan diarahkan ke kanal resmi.
- Mengurangi kredibilitas section community.

Recommendation:
- Sembunyikan item yang belum punya destination nyata.
- Atau tampilkan sebagai `Coming Soon` yang jelas non-clickable.

### 6. Accessibility mobile navigation masih kurang

Severity: Medium

Temuan:
- Tombol hamburger mobile hanya icon tanpa `aria-label`.
- Ini menyulitkan screen reader dan menurunkan clarity aksi untuk assistive technology.

Evidence:
- `src/components/AppLayout.tsx:34-39`

Impact:
- Menurunkan aksesibilitas dasar pada entry point navigasi utama di mobile.

Recommendation:
- Tambahkan `aria-label`, misalnya `Open navigation`.
- Pastikan drawer navigation punya fokus awal dan pola close yang konsisten.

## Positive Notes

- Visual identity konsisten dan tidak terasa generik.
- Sidebar information architecture cukup jelas untuk aplikasi internal.
- Theme, card system, dan iconography sudah punya bahasa desain yang stabil.
- Build production berhasil tanpa error.

## Technical UX Notes

- Build menghasilkan bundle JS utama besar, sekitar `1.67 MB` minified, dan asset logo berukuran sekitar `463 KB`.
- Ini bukan temuan visual langsung, tetapi tetap berdampak ke perceived performance dan first load experience.
- Perlu audit asset optimization dan code splitting lanjutan setelah masalah usability prioritas tinggi selesai.

## Priority Recommendations

### Priority 1

- Rework mobile landing agar CTA, navigasi section, dan body copy lebih cepat terbaca.
- Bedakan empty state dan error state di dashboard serta halaman listing.
- Tambahkan feedback retry saat fetch gagal.

### Priority 2

- Naikkan legibility dark UI, terutama metadata kecil dan label operasional.
- Perbaiki interaksi mobile pada halaman map.
- Tambahkan accessibility label untuk icon-only controls.

### Priority 3

- Rapikan affordance yang belum aktif seperti social links placeholder.
- Lanjutkan audit performance untuk asset besar dan bundle chunk utama.

## Suggested Next Step

Jika perubahan FE diminta pada tahap berikutnya, urutan eksekusi yang disarankan:
1. Landing mobile refinement.
2. Global empty and error state system.
3. Map mobile interaction upgrade.
4. Typography and accessibility pass.
