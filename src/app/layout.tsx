import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptBench — AI-Assisted Coding Assessment Platform",
  description:
    "Evaluate how developers prompt AI, validate outputs, debug injected bugs, and optimize token budgets with explainable 100-point scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="emerald"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
