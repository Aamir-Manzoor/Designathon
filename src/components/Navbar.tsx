"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Cpu,
  LogOut,
  Shield,
  User,
  LayoutDashboard,
  ClipboardCheck,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeProvider";
import type { UserRole } from "@/types/assessment";

interface NavbarProps {
  userName: string;
  userEmail: string;
  role: UserRole;
}

export function Navbar({ userName, role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-85"
            title="Back to Landing Page"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)]">
              <Cpu className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)] sm:text-base">
              PromptBench
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {(role === "admin" || role === "evaluator") && (
              <Link
                href="/admin"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] sm:px-3"
              >
                {role === "admin" ? (
                  <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                ) : (
                  <ClipboardCheck className="h-3.5 w-3.5 text-cyan-500" />
                )}
                <span className="hidden sm:inline">
                  {role === "admin" ? "Admin Console" : "Review Queue"}
                </span>
                <span className="sm:hidden">
                  {role === "admin" ? "Admin" : "Queue"}
                </span>
              </Link>
            )}
            {role !== "evaluator" && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] sm:px-3"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-500" />
                <span>Challenges</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {pathname !== "/profile" && <ThemeSwitcher />}

          <Link
            href="/profile"
            className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2.5 py-1.5 hover:border-[var(--accent-border)] sm:px-3"
            title="Open Profile & Account Settings"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold uppercase text-[var(--accent)]">
              {(userName || "U").slice(0, 2)}
            </span>
            <span className="hidden max-w-[130px] truncate text-xs font-semibold text-[var(--text-primary)] md:inline">
              {userName}
            </span>
            <span
              className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 lg:inline-flex ${
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
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:px-3"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
