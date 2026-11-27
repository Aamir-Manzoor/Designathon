"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, LogOut, Shield, User, LayoutDashboard } from "lucide-react";

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
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0b1120]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href={role === "admin" ? "/admin" : "/dashboard"}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/40">
              <Cpu className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              PromptBench
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                Evaluator Console
              </Link>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
              Challenges
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-right sm:flex">
            <div>
              <div className="text-xs font-medium text-white">{userName}</div>
              <div className="text-[11px] text-slate-400">{userEmail}</div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                role === "admin"
                  ? "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30"
                  : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
