import { useEffect, useRef } from "react";

/**
 * Cosmic observatory backdrop: layered nebula fields plus a parallax starfield
 * rendered on canvas with a slow depth drift. Motion supports the content and
 * never competes with it.
 */
export function CosmicBackground({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; z: number; r: number; hue: number };
    let stars: Star[] = [];

    const seed = () => {
      const count = Math.round((width * height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.85 + 0.15,
        r: Math.random() * 1.35 + 0.25,
        hue: Math.random(),
      }));
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    let pointerX = 0;
    let pointerY = 0;
    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    let t = 0;
    const draw = () => {
      t += reduced ? 0 : 0.0016;
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        const depth = s.z;
        const px = ((s.x + t * depth * 0.06 + pointerX * depth * 0.012) % 1.05) * width;
        const py =
          ((s.y + Math.sin(t * 1.6 + s.x * 12) * 0.002 + pointerY * depth * 0.012) % 1.05) * height;
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * 3 + s.hue * 9));
        const alpha = twinkle * depth * 0.85 * intensity;
        const color =
          s.hue > 0.82
            ? `rgba(124, 92, 255, ${alpha})`
            : s.hue > 0.62
              ? `rgba(52, 231, 231, ${alpha * 0.85})`
              : `rgba(226, 234, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * depth, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [intensity]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute -left-[20%] top-[-30%] h-[75vh] w-[75vw] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 42%, transparent), transparent 68%)",
          animation: "drift 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[65vh] w-[60vw] rounded-full blur-[150px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--indigo) 38%, transparent), transparent 70%)",
          animation: "drift 28s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute bottom-[-25%] left-[25%] h-[60vh] w-[55vw] rounded-full blur-[160px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--cyan) 24%, transparent), transparent 72%)",
          animation: "drift 34s ease-in-out infinite",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, transparent 40%, color-mix(in oklab, var(--background) 88%, transparent) 100%)",
        }}
      />
    </div>
  );
}
