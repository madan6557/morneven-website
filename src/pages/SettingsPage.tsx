import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">SETTINGS</h1>
      <div className="mecha-line w-32" />
      <div className="flex items-center gap-3">
        <span className="text-sm font-heading text-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
