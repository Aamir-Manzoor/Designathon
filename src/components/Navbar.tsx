"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cpu, LogOut, Shield, User, LayoutDashboard, ClipboardCheck } from "lucide-react";
import { ThemeSwitcher } from "./ThemeProvider";
import type { UserRole } from "@/types/assessment";

interface NavbarProps {
  userName: string;
  userEmail: string;
  role: UserRole;
}

export function Navbar({ userName, userEmail, role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

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
            {(role === "admin" || role === "evaluator") && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                {role === "admin" ? (
                  <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                ) : (
                  <ClipboardCheck className="h-3.5 w-3.5 text-cyan-500" />
                )}
                {role === "admin" ? "Admin Console" : "Review Queue"}
              </Link>
            )}
            {role !== "evaluator" && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-500" />
                Challenges
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {pathname !== "/profile" && <ThemeSwitcher />}

          <Link
            href="/profile"
            className="btn-tactile hidden items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1.5 hover:border-[var(--accent-border)] md:flex"
            title="Open Profile & Account Settings"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold uppercase text-[var(--accent)]">
              {(userName || "U").slice(0, 2)}
            </span>
            <span className="max-w-[140px] truncate text-xs font-semibold text-[var(--text-primary)]">
              {userName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                role === "admin"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-border)]"
                  : role === "evaluator"
                  ? "bg-cyan-500/15 text-cyan-500 ring-cyan-500/30"
                  : "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
              }`}
            >
              {role === "admin" ? (
                <Shield className="h-2.5 w-2.5" />
              ) : role === "evaluator" ? (
                <ClipboardCheck className="h-2.5 w-2.5" />
              ) : (
                <User className="h-2.5 w-2.5" />
              )}
              {role === "admin"
                ? "Admin"
                : role === "evaluator"
                ? "Evaluator"
                : "Candidate"}
            </span>
          </Link>

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
