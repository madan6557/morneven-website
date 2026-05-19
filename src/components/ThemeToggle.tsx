import { useEffect, useMemo, useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APP_THEMES,
  getActiveTheme,
  setAppTheme,
  subscribeThemeChange,
  type AppTheme,
} from "@/lib/theme";

const themeIcons = {
  dark: Moon,
  light: Sun,
  aurora: Sparkles,
} satisfies Record<AppTheme, typeof Sun>;

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(() => getActiveTheme());

  useEffect(() => subscribeThemeChange(setTheme), []);

  const activeTheme = useMemo(
    () => APP_THEMES.find((option) => option.value === theme) ?? APP_THEMES[0],
    [theme],
  );
  const ActiveIcon = themeIcons[activeTheme.value];

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-heading text-sm tracking-[0.12em] text-foreground uppercase">Theme preset</p>
        <p className="text-sm text-muted-foreground">{activeTheme.description}</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[15rem]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-primary">
          <ActiveIcon className="h-4 w-4" />
        </div>
        <Select
          value={theme}
          onValueChange={(value) => {
            const nextTheme = value as AppTheme;
            setTheme(nextTheme);
            setAppTheme(nextTheme);
          }}
        >
          <SelectTrigger
            className="h-10 border-border/70 bg-background/70 font-heading text-xs tracking-[0.12em] uppercase"
            aria-label="Select theme preset"
          >
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {APP_THEMES.map((option) => {
              const OptionIcon = themeIcons[option.value];
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <OptionIcon className="h-4 w-4 shrink-0" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
