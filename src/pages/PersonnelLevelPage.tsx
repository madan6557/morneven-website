import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Lock, Info } from "lucide-react";
import {
  PERSONNEL_TRACKS,
  PERSONNEL_LEVELS,
  PL_RESTRICTED_THRESHOLD,
  PL_LORE_ID,
  type PersonnelTrack,
  type PersonnelLevel,
} from "@/lib/pl";
import { useAuth } from "@/contexts/AuthContext";
import { personnelLevelBadgeStyle } from "@/lib/personnelTone";
import { TrackEmblem } from "@/components/TrackEmblem";

const ALL_TRACKS_KEY = "all" as const;
type TabKey = typeof ALL_TRACKS_KEY | PersonnelTrack;

export default function PersonnelLevelPage() {
  const { personnelLevel } = useAuth();
  const [tab, setTab] = useState<TabKey>(ALL_TRACKS_KEY);

  // Levels rendered top-down (L6 → L0).
  const ladder = [...PERSONNEL_LEVELS].reverse();

  const visibleTracks =
    tab === ALL_TRACKS_KEY
      ? PERSONNEL_TRACKS
      : PERSONNEL_TRACKS.filter((t) => t.key === tab);

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="relative h-40 md:h-52 overflow-hidden flex items-end bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link
            to="/lore/other"
            className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">
            PERSONNEL LEVEL · CLEARANCE MATRIX
          </h1>
          <p className="text-xs font-display tracking-wider text-accent-orange uppercase mt-1">
            World Systems · Access Doctrine
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />

        {/* Personnel primer */}
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="hud-border bg-card p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              <h2 className="font-heading text-sm tracking-[0.15em] uppercase">
                What Personnel Means
              </h2>
            </div>
            <p className="text-sm font-body text-foreground/80 leading-relaxed">
              In Morneven, <span className="text-foreground font-semibold">personnel</span> refers to every authenticated
              institute-affiliated operator who can be assigned clearance, doctrine scope, and a functional division.
              Personnel are not grouped by prestige, but by the kind of institutional burden they carry and the access
              required to carry it safely.
            </p>
            <p className="text-sm font-body text-foreground/80 leading-relaxed">
              The page below should be read as two systems working together:
              the <span className="text-foreground font-semibold">division</span> explains what kind of work a person is
              expected to perform, while the <span className="text-foreground font-semibold">Personnel Level</span> explains
              how far that person can act, see, approve, and override inside the institute.
            </p>
          </section>

          <section className="hud-border bg-card p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              <h2 className="font-heading text-sm tracking-[0.15em] uppercase">
                Reading Guide
              </h2>
            </div>
            <ul className="text-sm font-body text-foreground/80 leading-relaxed list-disc pl-5 space-y-1">
              <li>Division explains operational identity, role, and doctrine burden.</li>
              <li>Emblem explains the symbolic language attached to that division.</li>
              <li>PL explains visibility, authority, and override scope inside the same division.</li>
              <li>Equivalent PL across divisions means equal clearance, not equal task profile.</li>
            </ul>
          </section>
        </div>

        {/* Doctrine note */}
        <div className="hud-border bg-card p-4 md:p-5 space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <h2 className="font-heading text-sm tracking-[0.15em] uppercase">
              Doctrine
            </h2>
          </div>
          <p className="text-sm font-body text-foreground/80 leading-relaxed">
            Personnel Level (PL) governs facility access, intel visibility, and
            operational authority. It is <span className="text-foreground font-semibold">not</span> a
            social caste, salary band, or measure of personal worth. Each of
            the four career tracks below carries an equivalent ladder; an L5
            Mechanic and an L5 Executive hold equal clearance within their
            domains.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider uppercase px-2 py-1 rounded-sm border border-accent-orange/40 bg-accent-orange/10 text-accent-orange">
              <Lock className="h-3 w-3" /> L{PL_RESTRICTED_THRESHOLD}+ unlocks restricted lore
            </span>
            <Link
              to={`/lore/other/${PL_LORE_ID}`}
              className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider uppercase px-2 py-1 rounded-sm border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3 w-3" /> Read full PL doctrine
            </Link>
            <span className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider uppercase px-2 py-1 rounded-sm border border-primary/40 bg-primary/10 text-primary">
              Your clearance · L{personnelLevel}
            </span>
          </div>
        </div>

        {/* Track tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: ALL_TRACKS_KEY, label: "All Tracks" },
            ...PERSONNEL_TRACKS.map((t) => ({ key: t.key, label: t.label })),
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTab(opt.key as TabKey)}
              className={`px-3 sm:px-4 py-2 text-[11px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
                ${
                  tab === opt.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Division dossiers */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-heading text-sm tracking-[0.15em] uppercase text-foreground">
              Division Registry
            </h2>
            <p className="text-sm font-body text-foreground/75 leading-relaxed max-w-4xl">
              Each division below describes a different operational philosophy inside Morneven. The emblem is treated as
              a doctrinal shorthand, not decoration, and is meant to communicate the type of pressure, responsibility, and
              institutional logic that division carries.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
          {visibleTracks.map((trackInfo) => (
            <section
              key={trackInfo.key}
              className="hud-border bg-card p-4 md:p-5 space-y-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
                  <TrackEmblem
                    track={trackInfo.key}
                    size={40}
                    title={`${trackInfo.label} emblem`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg tracking-[0.08em] text-primary uppercase">
                      {trackInfo.label}
                    </h2>
                    <span className="inline-flex items-center rounded-sm border border-border px-2 py-1 text-[10px] font-display tracking-wider uppercase text-muted-foreground">
                      {trackInfo.short}
                    </span>
                  </div>
                  <p className="text-sm font-body leading-relaxed text-foreground/90">
                    {trackInfo.summary}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-2">
                  <p className="font-heading text-sm tracking-[0.15em] uppercase text-foreground">
                    Division Brief
                  </p>
                  <p className="text-sm font-body leading-relaxed text-foreground/80">
                    {trackInfo.description}
                  </p>
                </div>

                <div className="rounded-sm border border-border/70 bg-background/45 p-3 space-y-2">
                  <p className="font-heading text-sm tracking-[0.15em] uppercase text-foreground">
                    Emblem
                  </p>
                  <p className="text-[10px] font-display tracking-[0.12em] uppercase text-accent-orange">
                    {trackInfo.emblemTitle}
                  </p>
                  <p className="text-sm font-body leading-relaxed text-muted-foreground">
                    {trackInfo.emblemDescription}
                  </p>
                </div>
              </div>
            </section>
          ))}
          </div>
        </div>

        {/* Matrix table - desktop */}
        <div className="hidden md:block hud-border bg-card overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-20">
                  Level
                </th>
                {visibleTracks.map((t) => (
                  <th
                    key={t.key}
                    className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground"
                  >
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ladder.map((lvl) => {
                const youAreHere = lvl === personnelLevel;
                return (
                  <tr
                    key={lvl}
                    className={`border-b border-border/60 last:border-b-0 ${
                      youAreHere ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center text-[11px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border"
                          style={personnelLevelBadgeStyle(lvl)}
                        >
                          L{lvl}
                        </span>
                        {youAreHere && (
                          <span className="text-[9px] font-display tracking-wider uppercase text-primary">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    {visibleTracks.map((t) => (
                      <td
                        key={t.key}
                        className="p-3 align-top text-foreground/90"
                      >
                        {t.titles[lvl]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked per-track lists */}
        <div className="md:hidden space-y-4">
          {visibleTracks.map((t) => (
            <div key={t.key} className="hud-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-3 py-2">
                <p className="font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                  {t.label}
                </p>
              </div>
              <ul className="divide-y divide-border/60">
                {ladder.map((lvl) => {
                  const youAreHere = lvl === personnelLevel;
                  return (
                    <li
                      key={lvl}
                      className={`flex items-center justify-between gap-3 px-3 py-2 ${
                        youAreHere ? "bg-primary/5" : ""
                      }`}
                    >
                      <span
                        className="inline-flex items-center justify-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border"
                        style={personnelLevelBadgeStyle(lvl)}
                      >
                        L{lvl}
                      </span>
                      <span className="text-sm font-body text-foreground/90 text-right flex-1">
                        {t.titles[lvl]}
                      </span>
                      {youAreHere && (
                        <span className="text-[9px] font-display tracking-wider uppercase text-primary">
                          YOU
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Access notes */}
        <div className="max-w-3xl space-y-3">
          <h3 className="font-heading text-sm tracking-[0.15em] uppercase text-foreground">
            Access Notes
          </h3>
          <ul className="text-sm font-body text-foreground/80 leading-relaxed list-disc pl-5 space-y-1">
            <li>L0 personnel require continuous escort by L2+ staff in any restricted zone.</li>
            <li>L3 is the minimum clearance to read unredacted GEC dossiers.</li>
            <li>L5 is required to authorize a Sector Purge or activate DL-4+ engagement protocols.</li>
            <li>L6 carries cross-track override authority and is never delegated.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
