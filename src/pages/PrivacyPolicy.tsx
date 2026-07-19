import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoColor from "@/assets/logo-color.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoColor} alt="Morneven Logo" className="h-6 w-6" />
            <span className="font-display text-xs tracking-[0.2em] text-primary uppercase">Morneven</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary mb-2">
          KEBIJAKAN PRIVASI KRON
        </h1>
        <p className="font-body text-xs text-muted-foreground mb-8">
          Tanggal berlaku: 18 Juli 2026
        </p>

        <div className="mecha-line w-24 mb-8" />

        <div className="space-y-8 font-body text-sm leading-relaxed text-foreground/85">
          <p>
            KRON adalah aplikasi pencatatan keuangan local-first. Pengguna dapat memakai
            seluruh fungsi utama tanpa membuat akun dan tanpa koneksi internet.
          </p>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Data yang Diproses</h2>
            <p>
              KRON memproses data yang dimasukkan pengguna, termasuk akun keuangan,
              transaksi, budget, jadwal otomatis, catatan, dan foto bukti. Data tersebut
              disimpan pada perangkat pengguna dalam bentuk terenkripsi.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Google Drive</h2>
            <p className="mb-3">
              Jika pengguna secara sukarela mengaktifkan sinkronisasi Google Drive, KRON
              meminta scope <code className="bg-muted px-1.5 py-0.5 rounded text-xs">drive.appdata</code>.
              Scope ini hanya memberikan akses ke data aplikasi KRON yang tersembunyi pada
              Google Drive akun yang dipilih pengguna.
            </p>
            <p className="mb-3">
              KRON tidak meminta akses ke file Drive umum, dokumen, foto, kontak, email,
              atau data Google lain milik pengguna.
            </p>
            <p>
              Sebelum dikirim ke Google Drive, snapshot KRON dienkripsi pada perangkat.
              Google Account digunakan untuk memilih lokasi penyimpanan dan tidak digunakan
              untuk membuka kunci aplikasi.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Penggunaan dan Berbagi Data</h2>
            <p>
              KRON tidak menjual data, tidak menampilkan iklan, tidak memakai analytics
              pihak ketiga, dan tidak membagikan data keuangan kepada developer atau pihak
              lain. Tidak ada server KRON yang menerima data finansial pengguna.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Retensi dan Penghapusan</h2>
            <p>
              Data lokal tetap berada pada perangkat sampai pengguna menghapus atau mereset
              aplikasi. Pengguna dapat memutuskan Google Drive dari Pengaturan. Data aplikasi
              Drive dapat dihapus melalui KRON atau pengaturan Google Drive.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Keamanan</h2>
            <p>
              KRON menggunakan enkripsi database, enkripsi backup, Android Keystore,
              autentikasi perangkat opsional, checksum, dan jurnal audit. Tidak ada sistem
              yang dapat menjamin perlindungan mutlak pada perangkat yang telah sepenuhnya
              dikompromikan.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Kontak</h2>
            <p>
              Pertanyaan privasi dapat disampaikan melalui alamat dukungan resmi yang
              tercantum pada halaman distribusi KRON dan layar persetujuan Google OAuth.
              Pemilik distribusi wajib menjaga alamat tersebut tetap aktif dan memperbarui
              dokumen publik ini ketika alamat dukungan berubah.
            </p>
          </section>
        </div>

        <div className="mecha-line mt-12 mb-6" />
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-heading tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <p className="text-center font-display text-[10px] tracking-[0.3em] text-muted-foreground/40 uppercase">
          Powered by Imagination
        </p>
      </footer>
    </div>
  );
}
