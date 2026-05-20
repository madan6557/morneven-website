import { useEffect, useMemo, useState } from "react";
import {
  CircleDot,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  ChevronDown,
  Disc3,
  Moon,
  MoonStar,
  Orbit,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  SunMedium,
  Sunrise,
  Sunset,
  Wind,
} from "lucide-react";

import {
  APP_THEMES,
  getActiveTheme,
  getNextCompactTheme,
  setAppTheme,
  subscribeThemeChange,
  type AppTheme,
} from "@/lib/theme";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const themeIcons = {
  dark: Moon,
  light: Sun,
  noon: SunMedium,
  aurora: Sparkles,
  midnight: MoonStar,
  supermoon: Disc3,
  storm: CloudLightning,
  sunset: Sunset,
  dawn: Sunrise,
  rainy: CloudRain,
  foggy: CloudFog,
  blizzard: Snowflake,
  starfall: Star,
  tornado: Wind,
  eclipse: Orbit,
  redmoon: CircleDot,
} satisfies Record<AppTheme, typeof Sun>;

type ThemeToggleProps = {
  variant?: "compact" | "full";
};

export function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<AppTheme>(() => getActiveTheme());
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeThemeChange(setTheme), []);

  const activeTheme = useMemo(
    () => APP_THEMES.find((option) => option.value === theme) ?? APP_THEMES[0],
    [theme],
  );
  const ActiveIcon = themeIcons[activeTheme.value];

  const applyNextTheme = (nextTheme: AppTheme, preservePreference = false) => {
    setTheme(nextTheme);
    setAppTheme(nextTheme, { preservePreference });
    setOpen(false);
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => applyNextTheme(getNextCompactTheme(theme), true)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border/70 bg-background/70 text-primary transition-colors hover:bg-muted"
        aria-label={`Switch theme preset. Current: ${activeTheme.label}`}
        title={`Theme: ${activeTheme.label}`}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : theme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <ActiveIcon className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      <p className="font-heading text-sm tracking-[0.12em] text-foreground uppercase">Theme preset</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-muted/60"
            aria-label="Select theme preset"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-primary">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-xs tracking-[0.12em] text-foreground uppercase">{activeTheme.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeTheme.value === "light" || activeTheme.value === "dark" ? "Default preset" : "User preference"}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(30rem,calc(100vw-2rem))] border-border/70 bg-popover/95 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-heading text-xs tracking-[0.12em] text-foreground uppercase">Theme presets</p>
                <p className="text-xs text-muted-foreground">Choose a palette tuned for the Morneven UI.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {APP_THEMES.map((option) => {
                const OptionIcon = themeIcons[option.value];
                const selected = option.value === theme;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyNextTheme(option.value)}
                    className={cn(
                      "flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-md border px-2 py-3 text-center transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    title={option.description}
                  >
                    <OptionIcon className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-heading tracking-[0.12em] uppercase leading-3">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-sm leading-relaxed text-muted-foreground">{activeTheme.description}</p>
    </div>
  );
}
