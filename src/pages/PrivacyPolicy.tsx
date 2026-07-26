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
          KRON PRIVACY POLICY
        </h1>
        <p className="font-body text-xs text-muted-foreground mb-8">
          Effective Date: July 18, 2026
        </p>

        <div className="mecha-line w-24 mb-8" />

        <div className="space-y-8 font-body text-sm leading-relaxed text-foreground/85">
          <p>
            KRON is a local-first personal finance recording application. Users can
            use all core features without creating an account and without an internet
            connection.
          </p>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Data Processed</h2>
            <p>
              KRON processes data entered by the user, including financial accounts,
              transactions, budgets, scheduled automation, notes, and photo receipts.
              This data is stored on the user's device in encrypted form.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Google Drive</h2>
            <p className="mb-3">
              If the user voluntarily enables Google Drive synchronization, KRON
              requests the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">drive.appdata</code> scope.
              This scope only provides access to KRON application data hidden on the
              user's selected Google Drive account.
            </p>
            <p className="mb-3">
              KRON does not request access to general Drive files, documents, photos,
              contacts, emails, or any other Google data belonging to the user.
            </p>
            <p>
              Before being sent to Google Drive, KRON snapshots are encrypted on the
              device. The Google Account is used to select the storage location and is
              not used to unlock the application.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Data Usage and Sharing</h2>
            <p>
              KRON does not sell data, does not display advertisements, does not use
              third-party analytics, and does not share financial data with the
              developer or any third parties. There is no KRON server that receives
              user financial data.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Retention and Deletion</h2>
            <p>
              Local data remains on the device until the user deletes or resets the
              application. Users can disconnect Google Drive from Settings. Drive
              application data can be deleted through KRON or Google Drive settings.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Security</h2>
            <p>
              KRON uses database encryption, backup encryption, Android Keystore,
              optional device authentication, checksums, and audit logs. No system can
              guarantee absolute protection on a fully compromised device.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-base tracking-wider text-primary mb-3">Contact</h2>
            <p>
              Privacy inquiries can be submitted through the official support address
              listed on the KRON distribution page and the Google OAuth consent screen.
              The distribution owner must keep this address active and update this
              public document when the support address changes.
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
