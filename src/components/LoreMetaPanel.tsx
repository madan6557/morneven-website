import type { LoreMeta } from "@/types";
import {
  User,
  Users,
  Palette,
  Crown,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  GitBranch,
  ScrollText,
  ExternalLink,
} from "lucide-react";

interface LoreMetaPanelProps {
  meta?: LoreMeta;
  // Optional in-content fallback for `creator` so older entries that only
  // carry a top-level `contributor` field still render correctly.
  fallbackCreator?: string;
  accentColor?: string;
}

/**
 * Production-credit panel shown on every lore detail page (Metadata tab).
 * Renders only the fields that exist; an entry with no metadata returns a
 * single "no production data on file" placeholder so the tab remains stable.
 */
export default function LoreMetaPanel({ meta, fallbackCreator, accentColor }: LoreMetaPanelProps) {
  const m: LoreMeta = meta ?? {};
  const creator = m.creator ?? fallbackCreator;

  const rows: Array<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = [];
  if (creator) rows.push({ icon: <User className="h-3.5 w-3.5" />, label: "Creator", value: creator });
  if (m.owner) rows.push({ icon: <Crown className="h-3.5 w-3.5" />, label: "Owner", value: m.owner });
  if (m.designer) rows.push({ icon: <Palette className="h-3.5 w-3.5" />, label: "Designer", value: m.designer });
  if (m.collaborators && m.collaborators.length > 0)
    rows.push({
      icon: <Users className="h-3.5 w-3.5" />,
      label: "Collaborators",
      value: (
        <div className="flex flex-wrap gap-1">
          {m.collaborators.map((c) => (
            <span key={c} className="text-[11px] font-body bg-muted px-2 py-0.5 rounded-sm">{c}</span>
          ))}
        </div>
      ),
    });
  if (m.team) rows.push({ icon: <Users className="h-3.5 w-3.5" />, label: "Team", value: m.team });
  if (m.projectName)
    rows.push({ icon: <Briefcase className="h-3.5 w-3.5" />, label: "Project", value: m.projectName });
  if (m.startedAt)
    rows.push({ icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Started", value: m.startedAt });
  if (m.completedAt)
    rows.push({ icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Completed", value: m.completedAt });
  if (m.approvedAt || m.approvedBy)
    rows.push({
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      label: "Approved",
      value: [m.approvedAt, m.approvedBy ? `by ${m.approvedBy}` : null].filter(Boolean).join(" · "),
    });
  if (m.license) rows.push({ icon: <ScrollText className="h-3.5 w-3.5" />, label: "License", value: m.license });
  if (m.sourceUrl)
    rows.push({
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      label: "Source",
      value: (
        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {m.sourceUrl}
        </a>
      ),
    });

  const accentBorder = accentColor ? { borderColor: `${accentColor}30` } : undefined;
  const accentText = accentColor ? { color: accentColor } : undefined;

  if (rows.length === 0 && (!m.patchNotes || m.patchNotes.length === 0)) {
    return (
      <div className="hud-border bg-card p-6 text-center" style={accentBorder}>
        <p className="text-sm font-body text-muted-foreground italic">
          No production data on file. Authors can attach owner, team, dates, and patch notes from the Author Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="hud-border bg-card p-5 space-y-3" style={accentBorder}>
          <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={accentText}>
            Production Credits
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((r, i) => (
              <div key={i} className="space-y-0.5">
                <dt className="flex items-center gap-1.5 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                  {r.icon}
                  {r.label}
                </dt>
                <dd className="text-sm font-body text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {m.patchNotes && m.patchNotes.length > 0 && (
        <div className="hud-border bg-card p-5 space-y-3" style={accentBorder}>
          <h3 className="flex items-center gap-2 font-heading text-sm tracking-[0.15em] uppercase" style={accentText}>
            <GitBranch className="h-3.5 w-3.5" />
            Patch Notes
          </h3>
          <ul className="space-y-3">
            {m.patchNotes.map((p, i) => (
              <li key={i} className="border-l-2 pl-3 space-y-1" style={{ borderColor: accentColor ?? "hsl(var(--primary))" }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-display text-xs tracking-wider text-foreground">v{p.version}</span>
                  <span className="text-[10px] font-display tracking-wider text-muted-foreground">{p.date}</span>
                </div>
                <p className="text-xs font-body text-foreground/80 leading-relaxed whitespace-pre-wrap">{p.notes}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
