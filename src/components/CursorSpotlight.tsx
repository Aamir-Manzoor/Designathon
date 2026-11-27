"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Cursify-inspired smooth ambient cursor spotlight + trailing ring + inner dot.
 * Uses gsap.quickTo() on GPU transforms (x, y) for silky 60fps tracking.
 */
export function CursorSpotlight() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    const glow = glowRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!glow || !ring || !dot) return;

    gsap.set([glow, ring, dot], { xPercent: -50, yPercent: -50, opacity: 0 });

    const glowX = gsap.quickTo(glow, "x", { duration: 0.45, ease: "power3.out" });
    const glowY = gsap.quickTo(glow, "y", { duration: 0.45, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.16, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.16, ease: "power3.out" });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.05, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.05, ease: "power2.out" });

    let visible = false;

    function onMove(e: MouseEvent) {
      if (!visible) {
        visible = true;
        gsap.to(glow, { opacity: 1, duration: 0.3 });
        gsap.to([ring, dot], { opacity: 1, duration: 0.2 });
      }
      glowX(e.clientX);
      glowY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
    }

    function onLeave() {
      visible = false;
      gsap.to([glow, ring, dot], { opacity: 0, duration: 0.25 });
    }

    function onOverInteractive(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button")) {
        gsap.to(ring, { scale: 1.85, duration: 0.22, ease: "back.out(2)" });
      } else {
        gsap.to(ring, { scale: 1, duration: 0.2, ease: "power2.out" });
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOverInteractive, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOverInteractive);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[420px] w-[420px] rounded-full blur-[65px] will-change-transform md:block"
        style={{
          background:
            "radial-gradient(circle, var(--glow-a) 0%, var(--glow-b) 35%, transparent 72%)",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-9 w-9 rounded-full border-2 border-[var(--accent)]/80 shadow-[0_0_16px_var(--glow-a)] will-change-transform md:block"
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-2 w-2 rounded-full bg-[var(--accent)] will-change-transform md:block"
      />
    </>
  );
}
