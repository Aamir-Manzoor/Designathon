"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Cursify-inspired smooth ambient cursor spotlight + trailing ring.
 * Uses gsap.quickTo() on GPU transforms (x, y) for 60fps performance
 * and automatically disables on touch devices / prefers-reduced-motion.
 */
export function CursorSpotlight() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!isFinePointer || prefersReducedMotion) return;

    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!glow || !ring) return;

    gsap.set([glow, ring], { xPercent: -50, yPercent: -50, opacity: 0 });

    const glowX = gsap.quickTo(glow, "x", { duration: 0.55, ease: "power3.out" });
    const glowY = gsap.quickTo(glow, "y", { duration: 0.55, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.18, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.18, ease: "power3.out" });

    let visible = false;

    function onMove(e: MouseEvent) {
      if (!visible) {
        visible = true;
        gsap.to(glow, { opacity: 1, duration: 0.35 });
        gsap.to(ring, { opacity: 0.85, duration: 0.25 });
      }
      glowX(e.clientX);
      glowY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    }

    function onLeave() {
      visible = false;
      gsap.to([glow, ring], { opacity: 0, duration: 0.25 });
    }

    function onOverInteractive(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button")) {
        gsap.to(ring, { scale: 1.7, duration: 0.2, ease: "power2.out" });
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
      {/* Ambient radial spotlight following cursor */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden h-[360px] w-[360px] rounded-full blur-[70px] will-change-transform md:block"
        style={{
          background:
            "radial-gradient(circle, var(--glow-a) 0%, transparent 70%)",
        }}
      />
      {/* Subtle Cursify magnetic ring */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-7 w-7 rounded-full border border-[var(--accent)]/60 will-change-transform md:block"
      />
    </>
  );
}
