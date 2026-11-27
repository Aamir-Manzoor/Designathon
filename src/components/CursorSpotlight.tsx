"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Ultra-lightweight Cursify-style magnetic ring + dot cursor.
 * Only animates tiny 32px GPU transform layers (zero large fullscreen repaints)
 * and only triggers scale tweens on actual interactive state changes.
 */
export function CursorSpotlight() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50, opacity: 0 });

    const ringX = gsap.quickTo(ring, "x", { duration: 0.14, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.14, ease: "power3.out" });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.04, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.04, ease: "power2.out" });

    let visible = false;
    let isHovered = false;

    function onMove(e: MouseEvent) {
      if (!visible) {
        visible = true;
        gsap.to([ring, dot], { opacity: 1, duration: 0.2 });
      }
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
    }

    function onLeave() {
      visible = false;
      gsap.to([ring, dot], { opacity: 0, duration: 0.2 });
    }

    function onOverInteractive(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const nextHovered = Boolean(target?.closest("a, button"));
      if (nextHovered === isHovered) return;
      isHovered = nextHovered;
      gsap.to(ring, {
        scale: isHovered ? 1.75 : 1,
        duration: 0.18,
        ease: "power2.out",
      });
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
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-8 w-8 rounded-full border border-[var(--accent)]/80 will-change-transform md:block"
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-1.5 w-1.5 rounded-full bg-[var(--accent)] will-change-transform md:block"
      />
    </>
  );
}
