export default function GalleryPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">GALLERY</h1>
      <div className="mecha-line w-32" />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hud-border-sm aspect-square bg-card flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-heading tracking-wider">IMG-{String(i + 1).padStart(3, "0")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
