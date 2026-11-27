"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Sparkles, Moon, Sun } from "lucide-react";

export type AppTheme = "emerald" | "obsidian" | "light";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "emerald",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("emerald");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("promptbench_theme") as AppTheme | null;
      if (saved === "emerald" || saved === "obsidian" || saved === "light") {
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.setAttribute("data-theme", "emerald");
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "emerald");
    }
  }, []);

  function setTheme(next: AppTheme) {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("promptbench_theme", next);
    } catch {
      // ignore
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const options: Array<{
    id: AppTheme;
    label: string;
    short: string;
    icon: typeof Sparkles;
  }> = [
    { id: "emerald", label: "Carbon", short: "Carbon", icon: Sparkles },
    { id: "obsidian", label: "Obsidian", short: "Obsidian", icon: Moon },
    { id: "light", label: "Light", short: "Light", icon: Sun },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] p-0.5 shadow-sm"
      role="group"
      aria-label="Theme Switcher"
    >
      {options.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <opt.icon className="h-3 w-3" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
