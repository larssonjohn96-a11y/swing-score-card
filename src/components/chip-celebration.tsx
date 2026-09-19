import { useEffect, useRef } from "react";

/** A short, finite canvas celebration shared by holed chips and personal bests. */
export function ChipCelebration() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const width = window.innerWidth,
      height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = width * ratio;
    element.height = height * ratio;
    ctx.scale(ratio, ratio);
    const colors = ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#c4b5fd", "#fef3c7"];
    const random = (i: number) => {
      const n = Math.sin(i * 127.1 + 73.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const paper = Array.from({ length: 90 }, (_, i) => ({
      x: random(i + 1) * width,
      y: -20 - random(i + 101) * height * 0.6,
      vx: (random(i + 201) - 0.5) * 80,
      vy: 75 + random(i + 301) * 95,
      angle: random(i + 401) * Math.PI,
      spin: (random(i + 501) - 0.5) * 8,
      size: 4 + random(i + 601) * 4,
      color: colors[i % colors.length],
    }));
    const sparks = [0, 1, 2].flatMap((b) =>
      Array.from({ length: 24 }, (_, i) => ({
        x: width * [0.22, 0.78, 0.5][b],
        y: height * [0.25, 0.32, 0.2][b],
        at: [0.15, 0.65, 1.1][b],
        angle: (i * Math.PI) / 12,
        speed: 55 + random(i + b * 24 + 701) * 65,
        color: colors[(i + b) % colors.length],
      })),
    );
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      if (t > 2.7) return;
      const fade = Math.min(1, t / 0.2) * Math.min(1, (2.7 - t) / 0.55);
      for (const p of paper) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade * 0.95);
        ctx.translate(p.x + p.vx * t + Math.sin(t * 2 + p.angle) * 12, p.y + p.vy * t + 35 * t * t);
        ctx.rotate(p.angle + p.spin * t);
        ctx.scale(Math.cos(t * 5 + p.angle) * 0.6 + 0.7, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        ctx.restore();
      }
      for (const s of sparks) {
        const age = t - s.at;
        if (age < 0 || age > 1) continue;
        const distance = s.speed * age;
        ctx.save();
        ctx.globalAlpha = (1 - age) * fade;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        const x = s.x + Math.cos(s.angle) * distance,
          y = s.y + Math.sin(s.angle) * distance + 24 * age * age;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(s.angle) * 7 * (1 - age), y - Math.sin(s.angle) * 7 * (1 - age));
        ctx.stroke();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);
  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-chip-celebration
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
