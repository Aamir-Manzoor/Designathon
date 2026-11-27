"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "./ThemeProvider";

export function HeroThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 680;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const accentHex =
      theme === "light"
        ? 0x2563eb
        : theme === "obsidian"
        ? 0x6e7bff
        : 0x10b981;
    const secondaryHex = theme === "light" ? 0x059669 : 0x06b6d4;

    // 1. Floating 3D Token Nodes (Points)
    const nodeCount = 72;
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const velocities: Array<{ x: number; y: number; z: number }> = [];

    const c1 = new THREE.Color(accentHex);
    const c2 = new THREE.Color(secondaryHex);

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

      const mix = Math.random();
      const col = c1.clone().lerp(c2, mix);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      velocities.push({
        x: (Math.random() - 0.5) * 0.012,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.008,
      });
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: theme === "light" ? 0.22 : 0.2,
      vertexColors: true,
      transparent: true,
      opacity: theme === "light" ? 0.55 : 0.78,
    });

    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);

    // 2. Subtle Neural Constellation Connections (Lines)
    const maxSegments = 180;
    const linePositions = new Float32Array(maxSegments * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: theme === "light" ? 0.14 : 0.18,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // 3. Subtle wireframe icosahedron core floating in background
    const wireGeo = new THREE.IcosahedronGeometry(5.5, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      wireframe: true,
      transparent: true,
      opacity: theme === "light" ? 0.08 : 0.09,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(0, 1.2, -5);
    scene.add(wireMesh);

    let mouseX = 0;
    let mouseY = 0;

    function onMouseMove(e: MouseEvent) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function onResize() {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 680;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const posAttr = pointGeo.getAttribute("position") as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < nodeCount; i++) {
        arr[i * 3] += velocities[i].x;
        arr[i * 3 + 1] += velocities[i].y;
        arr[i * 3 + 2] += velocities[i].z;

        if (Math.abs(arr[i * 3]) > 18) velocities[i].x *= -1;
        if (Math.abs(arr[i * 3 + 1]) > 10) velocities[i].y *= -1;
        if (Math.abs(arr[i * 3 + 2]) > 8) velocities[i].z *= -1;
      }
      posAttr.needsUpdate = true;

      // Rebuild nearby edges
      let seg = 0;
      const lineAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute;
      const lArr = lineAttr.array as Float32Array;
      const thresholdSq = 24;

      for (let i = 0; i < nodeCount && seg < maxSegments; i++) {
        const ix = arr[i * 3];
        const iy = arr[i * 3 + 1];
        const iz = arr[i * 3 + 2];
        for (let j = i + 1; j < nodeCount && seg < maxSegments; j++) {
          const dx = ix - arr[j * 3];
          const dy = iy - arr[j * 3 + 1];
          const dz = iz - arr[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < thresholdSq) {
            const base = seg * 6;
            lArr[base] = ix;
            lArr[base + 1] = iy;
            lArr[base + 2] = iz;
            lArr[base + 3] = arr[j * 3];
            lArr[base + 4] = arr[j * 3 + 1];
            lArr[base + 5] = arr[j * 3 + 2];
            seg++;
          }
        }
      }
      lineGeo.setDrawRange(0, seg * 2);
      lineAttr.needsUpdate = true;

      // Smooth mouse parallax + gentle rotation
      scene.rotation.y += (mouseX * 0.16 - scene.rotation.y) * 0.04;
      scene.rotation.x += (mouseY * 0.08 - scene.rotation.x) * 0.04;
      wireMesh.rotation.y += 0.002;
      wireMesh.rotation.x += 0.001;

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      pointGeo.dispose();
      pointMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
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
      className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden opacity-90 [mask-image:radial-gradient(ellipse_85%_75%_at_50%_30%,#000_50%,transparent_100%)]"
    />
  );
}
