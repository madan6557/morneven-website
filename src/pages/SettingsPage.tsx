import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { PERSONNEL_TRACKS } from "@/lib/pl";
import { getQuota, pl2Status, pl3Status, pl4Status, monthKey, yearKey } from "@/services/managementApi";
import { AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { role, username, personnelLevel, track } = useAuth();
  const [quota, setQuota] = useState<{ pl2: number; pl3: number; pl4: number } | null>(null);

  useEffect(() => {
    getQuota(username).then((q) =>
      setQuota({
        pl2: pl2Status(q).count,
        pl3: pl3Status(q).count,
        pl4: pl4Status(q).count,
      }),
    );
  }, [username]);

  const trackInfo = PERSONNEL_TRACKS.find((t) => t.key === track);
  const title = trackInfo?.titles[personnelLevel] ?? "Unknown";

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">SETTINGS</h1>
      <div className="mecha-line w-32" />

      <div className="space-y-6 max-w-md">
        <div className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Appearance</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading text-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Account</h3>
          <div className="space-y-2 text-sm font-body">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="text-foreground">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-display text-xs tracking-wider text-primary uppercase">{role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clearance</span>
              <span className="font-display text-xs tracking-wider text-primary uppercase">L{personnelLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Track</span>
              <span className="font-display text-xs tracking-wider text-primary uppercase">
                {trackInfo?.short} - {trackInfo?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="text-foreground">{title}</span>
            </div>
          </div>
        </div>

        {role !== "guest" && (
          <div className="hud-border bg-card p-5 space-y-3">
            <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Obligation</h3>
            {personnelLevel >= 7 ? (
              <p className="text-xs text-muted-foreground">
                PL7 (Full Authority) holds no submission, supervision, or clearance obligations.
              </p>
            ) : (
              <div className="space-y-2 text-sm font-body">
                <Row label={`PL2 Personal (${monthKey()})`} value={`${quota?.pl2 ?? 0} / 1`} active={personnelLevel === 2} />
                <Row label={`PL3 Team (${yearKey()})`} value={`${quota?.pl3 ?? 0} / 1`} active={personnelLevel === 3} />
                <Row
                  label={`PL4 Supervision (${yearKey()})`}
                  value={`${quota?.pl4 ?? 0} / 2`}
                  active={personnelLevel >= 4 && personnelLevel < 7}
                />
              </div>
            )}
          </div>
        )}

        {personnelLevel >= 7 && (
          <div className="hud-border bg-card p-5 space-y-2 border-amber-500/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-heading text-sm tracking-[0.15em] text-amber-500 uppercase">Full Authority Notice</h3>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed">
              You hold PL7 clearance. Every approval, edit, and override you sign is irrevocable.
              Use the clearance switcher to preview lower tiers before publishing world-changing decisions.
            </p>
          </div>
        )}

        <div className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">About</h3>
          <p className="text-xs font-body text-muted-foreground leading-relaxed">
            Morneven Institute Official Portal - v0.4.2. Built to showcase the world of Gemora,
            its characters, technology, and ongoing projects.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={`font-display text-xs tracking-wider uppercase ${active ? "text-primary" : "text-muted-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
