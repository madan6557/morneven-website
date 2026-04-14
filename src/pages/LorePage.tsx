import { useState } from "react";

const tabs = ["Characters", "Places", "Technology"] as const;

export default function LorePage() {
  const [active, setActive] = useState<typeof tabs[number]>("Characters");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">LORE / WIKI</h1>
      <div className="mecha-line w-32" />

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
              ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="hud-border bg-card p-5 space-y-3">
            <div className={`h-32 bg-muted rounded-sm flex items-center justify-center ${active === "Places" ? "aspect-video h-auto" : ""}`}>
              <span className="text-xs text-muted-foreground font-heading">{active} #{n}</span>
            </div>
            <h3 className="font-heading text-base text-foreground">
              {active === "Characters" && `Character ${n}`}
              {active === "Places" && `Location ${n}`}
              {active === "Technology" && `Tech ${n}`}
            </h3>
            <p className="text-xs text-muted-foreground font-body">Lorem ipsum dolor sit amet.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
