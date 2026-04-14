import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

const widgets = [
  { title: "Latest Projects", items: ["Project Aethon — In Progress", "Worldshard Engine — Planning", "Stellarum Archives — On Hold"] },
  { title: "Featured Lore", items: ["Kael Vorthane — Shadow Operative", "The Iron Citadel — Fortress City", "Nexus Drive — FTL Technology"] },
  { title: "News Feed", items: ["Patch 0.4.2 deployed", "New character concept art released", "Lore entry: The Voidborn added"] },
];

export default function HomePage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">COMMAND CENTER</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((w, i) => (
          <motion.div
            key={w.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="hud-border bg-card p-5 space-y-4 glow-primary"
          >
            <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">{w.title}</h3>
            <div className="mecha-line" />
            <ul className="space-y-2">
              {w.items.map((item) => (
                <li key={item} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-yellow flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
