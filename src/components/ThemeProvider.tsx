"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Sparkles, Moon, Sun, ChevronDown, Check } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const options: Array<{
    id: AppTheme;
    label: string;
    icon: typeof Sparkles;
  }> = [
    { id: "emerald", label: "Carbon", icon: Sparkles },
    { id: "obsidian", label: "Obsidian", icon: Moon },
    { id: "light", label: "Light", icon: Sun },
  ];

  const current = options.find((o) => o.id === theme) || options[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select Theme"
        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:border-[var(--accent-border)]"
      >
        <CurrentIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
        {!compact && <span>{current.label}</span>}
        <ChevronDown
          className={`h-3 w-3 text-[var(--text-muted)] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-1 shadow-xl"
        >
          {options.map((opt) => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
