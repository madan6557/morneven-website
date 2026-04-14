import { useState } from "react";

const tabs = ["Planning", "On Progress", "On Hold", "Canceled"] as const;

export default function ProjectsPage() {
  const [active, setActive] = useState<typeof tabs[number]>("Planning");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">PROJECTS</h1>
      <div className="mecha-line w-32" />

      <div className="flex gap-2 flex-wrap">
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
            <h3 className="font-heading text-base text-foreground">Sample Project {n}</h3>
            <p className="text-xs text-muted-foreground font-body">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <span className="inline-block text-[10px] font-display tracking-wider text-accent-orange uppercase">{active}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
