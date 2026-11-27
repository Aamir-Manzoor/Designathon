import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
