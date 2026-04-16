import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, FlaskConical, Globe, ArrowRight, ExternalLink } from "lucide-react";
import logoColor from "@/assets/logo-color.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15 },
  }),
};

const features = [
  {
    icon: FlaskConical,
    title: "Research & Projects",
    desc: "Track ongoing experiments and collaborative research across species and disciplines.",
  },
  {
    icon: Users,
    title: "Character Archives",
    desc: "Meet the researchers, soldiers, and diplomats who shape the future of Gemora.",
  },
  {
    icon: BookOpen,
    title: "Lore & World Wiki",
    desc: "Explore the deep history, places, and technology of this expansive universe.",
  },
  {
    icon: Globe,
    title: "Community Gallery",
    desc: "Browse concept art, fan creations, and official visual development materials.",
  },
];

const socialLinks = [
  { name: "Discord", url: "#", label: "Join Community" },
  { name: "Twitter / X", url: "#", label: "@MornevenInst" },
  { name: "YouTube", url: "#", label: "Watch Trailers" },
  { name: "Instagram", url: "#", label: "Behind the Scenes" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ───── NAVBAR ───── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <img src={logoColor} alt="Morneven Logo" className="h-7 w-7" />
            <span className="font-display text-sm tracking-[0.2em] text-primary uppercase">Morneven</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-heading font-normal tracking-wider text-muted-foreground uppercase">
            <a href="#about" className="hover:text-primary transition-colors">About</a>
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#community" className="hover:text-primary transition-colors">Community</a>
          </div>
          <Link
            to="/auth"
            className="text-xs font-display tracking-[0.15em] text-primary border border-primary/30 px-4 py-1.5 rounded hover:bg-primary/10 transition-colors uppercase"
          >
            Enter
          </Link>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-14">
        {/* Scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-px bg-primary/10 animate-scan-line" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative text-center z-10 space-y-8 px-6 py-10 md:py-12"
        >
          {/* Grid decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 w-[300%] -translate-x-1/2 mecha-line opacity-60" />
            <div className="absolute bottom-0 left-1/2 w-[300%] -translate-x-1/2 mecha-line opacity-60" />
            <div className="absolute top-1/2 -left-[40%] h-[200%] -translate-y-1/2 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
            <div className="absolute top-1/2 -right-[40%] h-[200%] -translate-y-1/2 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          </div>

          <motion.img
            src={logoColor}
            alt="Morneven Institute Logo"
            className="h-24 w-24 md:h-32 md:w-32 mx-auto drop-shadow-lg"
            variants={fadeUp}
            custom={0}
          />

          <motion.div className="space-y-2" variants={fadeUp} custom={1}>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-[0.15em] text-primary">
              MORNEVEN
            </h1>
            <p className="font-heading text-lg md:text-xl tracking-[0.3em] text-muted-foreground uppercase">
              Institute
            </p>
          </motion.div>

          <motion.div className="mecha-line w-48 mx-auto" variants={fadeUp} custom={2} />

          <motion.div variants={fadeUp} custom={3} className="space-y-4 max-w-lg mx-auto">
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              An interspecies research institute led by the Jewerlians, in collaboration with Humans and Demi-humans.
              Dedicated to developing technology for peace and uncovering the ancient history of Gemora.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="relative z-20 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 hud-border px-10 py-3 bg-primary/5 hover:bg-primary/10 transition-colors font-display text-xs tracking-[0.25em] text-primary uppercase glow-primary"
            >
              Enter the Archive
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#about"
              className="inline-flex items-center gap-2 px-10 py-3 border border-border hover:border-primary/40 transition-colors font-display text-xs tracking-[0.25em] text-muted-foreground uppercase bg-background/80 backdrop-blur-sm"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 z-10"
        >
          <div className="w-px h-12 bg-gradient-to-b from-primary/40 to-transparent mx-auto animate-pulse" />
        </motion.div>
      </section>

      {/* ───── ABOUT ───── */}
      <section id="about" className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={fadeUp} custom={0} className="space-y-6">
              <div>
                <p className="font-display text-[10px] tracking-[0.4em] text-accent-orange uppercase mb-2">About the Institute</p>
                <h2 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">
                  BRIDGING WORLDS
                </h2>
                <div className="mecha-line w-24 mt-3" />
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                Founded in the aftermath of the Great Convergence, the Morneven Institute serves as Gemora's
                foremost center for interspecies collaboration. Here, Jewerlian crystal-engineers work alongside
                Human physicists and Demi-human bio-architects to push the boundaries of what's possible.
              </p>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                Our mission extends beyond mere research — we seek to preserve the forgotten histories buried
                beneath Gemora's surface and build a future where all species can thrive together.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="relative">
              <div className="aspect-square rounded-lg border border-border bg-card/50 flex items-center justify-center overflow-hidden">
                <img src={logoColor} alt="Morneven" className="h-40 w-40 opacity-60" />
              </div>
              {/* HUD corners */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-primary/40" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-primary/40" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-primary/40" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-primary/40" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" className="relative py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-16"
          >
            <motion.div variants={fadeUp} custom={0} className="text-center space-y-3">
              <p className="font-display text-[10px] tracking-[0.4em] text-accent-orange uppercase">What Awaits</p>
              <h2 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">
                EXPLORE THE ARCHIVE
              </h2>
              <div className="mecha-line w-32 mx-auto mt-3" />
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  custom={i + 1}
                  className="group p-6 rounded-lg border border-border bg-card/40 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 space-y-4"
                >
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-heading text-sm tracking-wide text-foreground">{f.title}</h3>
                  <p className="font-body text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── COMMUNITY / SOCIAL ───── */}
      <section id="community" className="relative py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="space-y-12"
          >
            <motion.div variants={fadeUp} custom={0} className="text-center space-y-3">
              <p className="font-display text-[10px] tracking-[0.4em] text-accent-orange uppercase">Stay Connected</p>
              <h2 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">
                JOIN THE COMMUNITY
              </h2>
              <div className="mecha-line w-32 mx-auto mt-3" />
              <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
                Follow the development of Morneven Institute across platforms. Get updates, behind-the-scenes content, and connect with fellow explorers.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {socialLinks.map((s, i) => (
                <motion.a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={fadeUp}
                  custom={i + 1}
                  className="group flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 bg-card/30 hover:bg-card/60 transition-all duration-300"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-foreground">{s.name}</p>
                    <p className="font-body text-xs text-muted-foreground truncate">{s.label}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={logoColor} alt="Morneven" className="h-6 w-6" />
                <span className="font-display text-xs tracking-[0.2em] text-primary uppercase">Morneven Institute</span>
              </div>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                Science · Fantasy · Creation
              </p>
            </div>

            {/* Quick links */}
            <div className="space-y-3">
              <p className="font-heading text-xs tracking-wider text-foreground uppercase">Quick Links</p>
              <div className="flex flex-col gap-2">
                <a href="#about" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">About</a>
                <a href="#features" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">Features</a>
                <a href="#community" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">Community</a>
                <Link to="/auth" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">Enter Archive</Link>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <p className="font-heading text-xs tracking-wider text-foreground uppercase">Project</p>
              <div className="flex flex-col gap-2">
                <p className="font-body text-xs text-muted-foreground">An original Sci-Fi Fantasy IP</p>
                <p className="font-body text-xs text-muted-foreground">All content is fictional</p>
                <p className="font-body text-xs text-muted-foreground">© 2026 Morneven Institute</p>
              </div>
            </div>
          </div>

          <div className="mecha-line mt-8 mb-4" />
          <p className="text-center font-display text-[10px] tracking-[0.3em] text-muted-foreground/40 uppercase">
            Powered by Imagination
          </p>
        </div>
      </footer>
    </div>
  );
}
