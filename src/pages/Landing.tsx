import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full mecha-line" />
        <div className="absolute top-3/4 left-0 w-full mecha-line" />
        <div className="absolute top-0 left-1/4 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-0 right-1/4 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        {/* Corner accents */}
        <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-primary/20" />
        <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-primary/20" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-primary/20" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-primary/20" />
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-px bg-primary/10 animate-scan-line" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 space-y-8 px-6"
      >
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-[0.15em] text-primary">
              MORNEVEN
            </h1>
          </motion.div>
          <p className="font-heading text-lg md:text-xl tracking-[0.3em] text-muted-foreground uppercase">
            Institute
          </p>
        </div>

        <div className="mecha-line w-48 mx-auto" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4 max-w-lg mx-auto"
        >
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            An interspecies research institute led by the Jewerlians, in collaboration with Humans and Demi-humans. 
            Dedicated to developing technology for peace and uncovering the ancient history of Gemora.
          </p>
          <p className="font-body text-xs text-muted-foreground/60 leading-relaxed">
            Explore the world, discover its characters, and follow the progress of our ongoing projects.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            to="/auth"
            className="inline-block hud-border px-10 py-3 bg-primary/5 hover:bg-primary/10 transition-colors font-display text-xs tracking-[0.25em] text-primary uppercase glow-primary"
          >
            Enter the Archive
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 text-center z-10"
      >
        <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground/40 uppercase">
          Science · Fantasy · Creation
        </p>
      </motion.div>
    </div>
  );
}
