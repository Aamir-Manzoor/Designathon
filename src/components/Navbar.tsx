"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, LogOut, Shield, User, LayoutDashboard } from "lucide-react";
import { ThemeSwitcher } from "./ThemeProvider";

interface NavbarProps {
  userName: string;
  userEmail: string;
  role: "admin" | "candidate";
}

export function Navbar({ userName, userEmail, role }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
            title="Back to Landing Page"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <Cpu className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              PromptBench
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                Evaluator Console
              </Link>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-emerald-500" />
              Challenges
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          <div className="hidden items-center gap-2.5 border-l border-[var(--border-subtle)] pl-3 text-right md:flex">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {userName}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {userEmail}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                role === "admin"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-border)]"
                  : "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
              }`}
            >
              {role === "admin" ? (
                <Shield className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {role === "admin" ? "Admin" : "Candidate"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
