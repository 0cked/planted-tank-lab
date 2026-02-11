"use client";

import { useEffect, useRef } from "react";

type Ripple = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function CursorRippleHeroEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mediaReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaReduce.matches) return;

    const hero = document.getElementById("hero-ripple-root");
    const textWarp = document.getElementById("hero-text-warp");
    if (!hero || !textWarp) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let lastX = -9999;
    let lastY = -9999;
    let textDx = 0;
    let textDy = 0;
    let textVx = 0;
    let textVy = 0;
    let targetDx = 0;
    let targetDy = 0;
    const ripples: Ripple[] = [];

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addRipple = (x: number, y: number, speed = 0) => {
      if (ripples.length > 24) ripples.shift();
      ripples.push({
        x,
        y,
        radius: 10 + speed * 0.1,
        alpha: clamp(0.42 + speed * 0.0025, 0.25, 0.8),
      });
    };

    const onMove = (ev: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const inBounds = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (!inBounds) return;

      const dx = x - lastX;
      const dy = y - lastY;
      const speed = Math.hypot(dx, dy);
      if (speed > 4) addRipple(x, y, speed);

      lastX = x;
      lastY = y;

      const cx = rect.width * 0.35;
      const cy = rect.height * 0.45;
      const pullX = (x - cx) / rect.width;
      const pullY = (y - cy) / rect.height;
      targetDx = clamp(pullX * 18 + dx * 0.14, -20, 20);
      targetDy = clamp(pullY * 14 + dy * 0.12, -16, 16);
    };

    const onLeave = () => {
      targetDx = 0;
      targetDy = 0;
      lastX = -9999;
      lastY = -9999;
    };

    const draw = () => {
      if (!running) return;
      const rect = hero.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.85;
        r.alpha *= 0.965;

        if (r.alpha < 0.02 || r.radius > Math.max(rect.width, rect.height) * 0.45) {
          ripples.splice(i, 1);
          continue;
        }

        const g = ctx.createRadialGradient(r.x, r.y, r.radius * 0.15, r.x, r.y, r.radius);
        g.addColorStop(0, `rgba(210,245,255,${r.alpha * 0.55})`);
        g.addColorStop(0.45, `rgba(122,214,255,${r.alpha * 0.28})`);
        g.addColorStop(1, "rgba(122,214,255,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(225,250,255,${r.alpha * 0.7})`;
        ctx.lineWidth = clamp(2 - r.radius / 140, 0.6, 2);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }

      const spring = 0.07;
      const damping = 0.84;
      textVx += (targetDx - textDx) * spring;
      textVy += (targetDy - textDy) * spring;
      textVx *= damping;
      textVy *= damping;
      textDx += textVx;
      textDy += textVy;

      const skew = clamp(textDx * 0.22, -4.5, 4.5);
      const wave = clamp(Math.hypot(textVx, textVy) * 0.4, 0, 6);
      textWarp.style.transform = `translate3d(${textDx.toFixed(2)}px, ${textDy.toFixed(2)}px, 0) skewX(${skew.toFixed(2)}deg)`;
      textWarp.style.filter = `drop-shadow(${(textDx * 0.12).toFixed(2)}px ${(textDy * 0.18).toFixed(2)}px ${wave.toFixed(2)}px rgba(120,220,255,0.23))`;

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => resize());
    ro.observe(hero);

    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      textWarp.style.transform = "";
      textWarp.style.filter = "";
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] mix-blend-screen"
    />
  );
}
