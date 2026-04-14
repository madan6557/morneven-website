import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { role, username } = useAuth();

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
          </div>
        </div>

        <div className="hud-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">About</h3>
          <p className="text-xs font-body text-muted-foreground leading-relaxed">
            Morneven Institute Official Portal — v0.4.2. Built to showcase the world of Gemora, 
            its characters, technology, and ongoing projects.
          </p>
        </div>
      </div>
    </div>
  );
}
