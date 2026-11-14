'use client';

import { useEffect, useRef } from 'react';
import './AeroLite.css';

export default function AeroLite({ className = '', style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'aerolite-canvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let raf = 0;
    let lastFrameTime = 0;
    let lastDraw = 0;

    const shapes = [];
    const COLORS = ['#896ABD', '#A855F7', '#9B7ED8', '#B88FF0', '#C9A8F5'];

    for (let i = 0; i < 48; i++) {
      shapes.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.008,
        vy: (Math.random() - 0.5) * 0.008,
        size: 12 + Math.random() * 28,
        sides: Math.random() < 0.5 ? 3 : 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.002,
        color: COLORS[Math.floor(Math.random() * 5)],
        alpha: 0.15 + Math.random() * 0.25,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
      });
    }

    const resize = () => {
      canvas.width = Math.max(1, Math.round(container.clientWidth));
      canvas.height = Math.max(1, Math.round(container.clientHeight));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    const draw = (now) => {
      const dt = lastDraw ? Math.min((now - lastDraw) / 1000, 0.1) : 0;
      lastDraw = now;
      const k = dt * 60;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const s of shapes) {
        s.x += s.vx * k;
        s.y += s.vy * k;
        s.rotation += s.rotationSpeed * k;

        s.phaseX += 0.001 * k;
        s.phaseY += 0.0013 * k;
        s.x += Math.sin(s.phaseX) * 0.0003 * k;
        s.y += Math.cos(s.phaseY) * 0.0003 * k;

        if (s.x < -0.1) s.x = 1.1;
        if (s.x > 1.1) s.x = -0.1;
        if (s.y < -0.1) s.y = 1.1;
        if (s.y > 1.1) s.y = -0.1;

        const cx = s.x * canvas.width;
        const cy = s.y * canvas.height;
        const size = s.size * Math.min(canvas.width, canvas.height) / 400;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        if (s.sides === 3) {
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.866, size * 0.5);
          ctx.lineTo(-size * 0.866, size * 0.5);
        } else {
          ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;

      const gateMs = 1000 / 30 - 4;
      if (lastFrameTime && now - lastFrameTime < gateMs) return;
      lastFrameTime = now;

      draw(now);
    };

    const prefersReduced = () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const cleanup = () => {
      cancelAnimationFrame(raf);
      canvas.remove();
    };

    const observer = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible) {
        if (!raf && !prefersReduced()) {
          raf = requestAnimationFrame(tick);
        }
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    observer.observe(container);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !prefersReduced()) {
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const prefersReducedMotion = prefersReduced();
    if (prefersReducedMotion) {
      resize();
      draw(performance.now());
      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
        cleanup();
      };
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', resize);
      cleanup();
    };
  }, []);

  return (
    <div ref={containerRef} className={`aerolite ${className}`} style={style} />
  );
}