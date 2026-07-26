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
          KRON TERMS OF SERVICE
        </h1>
        <p className="font-body text-xs text-muted-foreground mb-8">
          Effective Date: July 19, 2026
        </p>

        <div className="mecha-line w-24 mb-8" />

        <div className="space-y-8 font-body text-sm leading-relaxed text-foreground/85">
          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using KRON, the user agrees to all of
              these terms and conditions. If you do not agree, do not use this
              application.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">2. Service Description</h2>
            <p className="mb-3">
              KRON is a local-first personal finance recording application. All user
              data is stored on the user's device in encrypted form. KRON has no
              backend server and does not collect user data automatically.
            </p>
            <p>
              Google Drive synchronization is optional and only active when the user
              voluntarily connects their Google account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">3. License</h2>
            <p>
              The user is granted a non-exclusive, non-transferable, and limited
              license to use KRON on devices the user owns or controls. This license
              does not grant the right to modify, reverse engineer, distribute, or
              sell the application without written permission from the developer.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">4. Data and Privacy</h2>
            <p>
              KRON does not collect, store, or transmit user data to any server
              owned by the developer. Financial data, notes, and photo receipts
              remain on the user's device. Further details are available in the{" "}
              <Link to="/privacy" className="text-primary underline hover:text-primary/90">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">5. Google Drive Synchronization</h2>
            <p className="mb-3">Google Drive synchronization is optional. When enabled:</p>
            <ul className="list-disc pl-5 space-y-2 mb-3">
              <li>
                KRON requests the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">drive.appdata</code> scope
                which only accesses the hidden application data folder.
              </li>
              <li>
                Snapshots sent to Google Drive are encrypted on the device before
                upload.
              </li>
              <li>Users can disconnect at any time through Settings.</li>
              <li>
                The developer is not responsible for data lost or altered due to
                synchronization usage.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">6. No Warranties</h2>
            <p>
              KRON is provided as-is without any warranties, whether express or
              implied. The developer does not guarantee the application is free from
              errors, interruptions, or data loss. Users are responsible for
              backing up their data regularly.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">7. Limitation of Liability</h2>
            <p>
              The developer shall not be liable for any direct, indirect,
              incidental, or consequential damages arising from the use of or
              inability to use KRON, including but not limited to loss of financial
              data or financial losses.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">8. Changes to Terms</h2>
            <p>
              The developer may modify these terms and conditions at any time.
              Changes will be announced through application updates. Continued use
              after changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">9. Governing Law</h2>
            <p>
              These terms are governed by the laws of Indonesia. All disputes shall
              be resolved through mutual deliberation first.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">10. Contact</h2>
            <p>
              Inquiries regarding these terms can be submitted through the official
              support address listed on the KRON distribution page and the Google
              OAuth consent screen.
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
