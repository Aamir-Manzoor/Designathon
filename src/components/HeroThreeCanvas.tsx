"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "./ThemeProvider";

/**
 * Ultra-lightweight Three.js 3D Neural Constellation:
 * Geometry & edges are computed ONCE at mount (zero per-frame buffer uploads),
 * DPR is capped at 1, no CSS mask-image compositing, and pauses off-screen.
 */
export function HeroThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 720;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const accentHex =
      theme === "light"
        ? 0x2563eb
        : theme === "obsidian"
        ? 0x6e7bff
        : 0x10b981;
    const secondaryHex = theme === "light" ? 0x059669 : 0x22d3ee;

    const group = new THREE.Group();
    scene.add(group);

    // 1. Static GPU-resident 3D constellation points + precomputed edges
    const nodeCount = 52;
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const c1 = new THREE.Color(accentHex);
    const c2 = new THREE.Color(secondaryHex);

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      const col = c1.clone().lerp(c2, Math.random());
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pointMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: theme === "light" ? 0.65 : 0.85,
    });
    group.add(new THREE.Points(pointGeo, pointMat));

    // Precompute edges ONCE (zero per-frame O(N^2) loop!)
    const edgeVerts: number[] = [];
    const thresholdSq = 34;
    for (let i = 0; i < nodeCount; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = ix - positions[j * 3];
        const dy = iy - positions[j * 3 + 1];
        const dz = iz - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < thresholdSq) {
          edgeVerts.push(
            ix,
            iy,
            iz,
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2]
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgeVerts, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: theme === "light" ? 0.18 : 0.24,
    });
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    // 2. Wireframe core + orbit ring
    const wireGeo = new THREE.IcosahedronGeometry(5.8, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      wireframe: true,
      transparent: true,
      opacity: theme === "light" ? 0.13 : 0.16,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(0, 0.5, -4);
    scene.add(wireMesh);

    const ringGeo = new THREE.TorusGeometry(9, 0.05, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      transparent: true,
      opacity: theme === "light" ? 0.2 : 0.26,
    });
    const orbitRing = new THREE.Mesh(ringGeo, ringMat);
    orbitRing.rotation.x = Math.PI / 3;
    orbitRing.position.set(0, 0.5, -5);
    scene.add(orbitRing);

    let mouseX = 0;
    let mouseY = 0;
    let isInView = true;

    function onMouseMove(e: MouseEvent) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function onResize() {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let animId = 0;
    let lastRender = 0;

    function animate(now: number) {
      animId = requestAnimationFrame(animate);
      if (document.hidden || !isInView) return;
      // Smooth 30fps cap keeps integrated GPUs cool & scrolling silky
      if (now - lastRender < 32) return;
      lastRender = now;

      group.rotation.y += 0.0022;
      group.rotation.x += (mouseY * 0.1 - group.rotation.x) * 0.05;
      scene.rotation.y += (mouseX * 0.2 - scene.rotation.y) * 0.05;
      wireMesh.rotation.y += 0.006;
      wireMesh.rotation.x += 0.003;
      orbitRing.rotation.z -= 0.007;

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      pointGeo.dispose();
      pointMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden"
    />
  );
}
