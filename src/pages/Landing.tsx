import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full mecha-line" />
        <div className="absolute top-3/4 left-0 w-full mecha-line" />
        <div className="absolute top-0 left-1/4 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 right-1/4 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 space-y-8"
      >
        <div className="space-y-2">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[0.15em] text-primary">
            MORNEVEN
          </h1>
          <p className="font-heading text-lg md:text-xl tracking-[0.3em] text-muted-foreground uppercase">
            Institute
          </p>
        </div>

        <div className="mecha-line w-48 mx-auto" />

        <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          A nexus of worlds, stories, and creation. Enter the archive.
        </p>

        <Link
          to="/auth"
          className="inline-block hud-border px-10 py-3 bg-primary/5 hover:bg-primary/10 transition-colors font-display text-xs tracking-[0.25em] text-primary uppercase glow-primary"
        >
          Enter
        </Link>
      </motion.div>
    </div>
  );
}
