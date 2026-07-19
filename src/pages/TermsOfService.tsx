import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoColor from "@/assets/logo-color.png";

export default function TermsOfService() {
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
          SYARAT DAN KETENTUAN PENGGUNAAN KRON
        </h1>
        <p className="font-body text-xs text-muted-foreground mb-8">
          Tanggal berlaku: 19 Juli 2026
        </p>

        <div className="mecha-line w-24 mb-8" />

        <div className="space-y-8 font-body text-sm leading-relaxed text-foreground/85">
          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">1. Penerimaan Ketentuan</h2>
            <p>
              Dengan mengunduh, menginstal, atau menggunakan KRON, pengguna menyetujui
              seluruh syarat dan ketentuan ini. Jika tidak setuju, jangan gunakan aplikasi ini.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">2. Deskripsi Layanan</h2>
            <p className="mb-3">
              KRON adalah aplikasi pencatatan keuangan local-first. Seluruh data pengguna
              disimpan pada perangkat pengguna dalam bentuk terenkripsi. KRON tidak memiliki
              server backend dan tidak mengumpulkan data pengguna secara otomatis.
            </p>
            <p>
              Fitur sinkronisasi Google Drive bersifat opsional dan hanya aktif jika pengguna
              secara sukarela menghubungkan akun Google mereka.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">3. Lisensi</h2>
            <p>
              Pengguna diberikan lisensi non-eksklusif, tidak dapat dialihkan, dan terbatas
              untuk menggunakan KRON pada perangkat yang pengguna miliki atau kendalikan.
              Lisensi ini tidak memberikan hak untuk memodifikasi, merekayasa ulang,
              mendistribusikan, atau menjual aplikasi tanpa izin tertulis dari pengembang.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">4. Data dan Privasi</h2>
            <p>
              KRON tidak mengumpulkan, menyimpan, atau mengirimkan data pengguna ke server
              mana pun milik pengembang. Data keuangan, catatan, dan foto bukti tetap berada
              pada perangkat pengguna. Detail lebih lanjut tersedia di{" "}
              <Link to="/privacy" className="text-primary underline hover:text-primary/90">
                Kebijakan Privasi
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">5. Sinkronisasi Google Drive</h2>
            <p className="mb-3">Fitur sinkronisasi Google Drive bersifat opsional. Saat diaktifkan:</p>
            <ul className="list-disc pl-5 space-y-2 mb-3">
              <li>
                KRON meminta scope <code className="bg-muted px-1.5 py-0.5 rounded text-xs">drive.appdata</code>{" "}
                yang hanya mengakses folder data aplikasi tersembunyi.
              </li>
              <li>
                Snapshot yang dikirim ke Google Drive telah dienkripsi pada perangkat sebelum diunggah.
              </li>
              <li>Pengguna dapat memutuskan koneksi kapan saja melalui Pengaturan.</li>
              <li>
                Pengembang tidak bertanggung jawab atas data yang hilang atau berubah akibat
                penggunaan sinkronisasi.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">6. Tidak Ada Jaminan</h2>
            <p>
              KRON disediakan sebagaimana adanya tanpa jaminan apa pun, baik tersurat maupun
              tersirat. Pengembang tidak menjamin aplikasi bebas dari kesalahan, gangguan,
              atau kehilangan data. Pengguna bertanggung jawab untuk mencadangkan data secara
              berkala.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">7. Batasan Tanggung Jawab</h2>
            <p>
              Pengembang tidak bertanggung jawab atas kerugian langsung, tidak langsung,
              insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan
              menggunakan KRON, termasuk namun tidak terbatas pada kehilangan data keuangan
              atau kerugian finansial.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">8. Perubahan Ketentuan</h2>
            <p>
              Pengembang dapat mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan
              akan diumumkan melalui pembaruan aplikasi. Penggunaan lanjutan setelah perubahan
              berlaku menyatakan penerimaan terhadap ketentuan yang telah diperbarui.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">9. Hukum yang Berlaku</h2>
            <p>
              Ketentuan ini tunduk pada hukum Indonesia. Segala perselisihan diselesaikan
              melalui musyawarah terlebih dahulu.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">10. Kontak</h2>
            <p>
              Pertanyaan mengenai ketentuan ini dapat disampaikan melalui alamat dukungan
              resmi yang tercantum pada halaman distribusi KRON dan layar persetujuan Google
              OAuth.
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
