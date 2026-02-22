"use client";

import * as React from "react";

export function HeroBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number>();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();

    // Color palette
    const indigo = { r: 99, g: 102, b: 241 };
    const green = { r: 34, g: 197, b: 94 };

    // Waveform bars configuration
    const waveformBars: Array<{
      x: number;
      baseHeight: number;
      phase: number;
      speed: number;
    }> = [];

    const initWaveformBars = () => {
      waveformBars.length = 0;
      const barCount = 80;
      const barSpacing = width / (barCount + 1);

      for (let i = 0; i < barCount; i++) {
        waveformBars.push({
          x: barSpacing * (i + 1),
          baseHeight: 2 + Math.random() * 4,
          phase: (i / barCount) * Math.PI * 4,
          speed: 0.02 + Math.random() * 0.01,
        });
      }
    };

    initWaveformBars();

    // Combined resize handler
    const handleResize = () => {
      resize();
      initWaveformBars();
    };
    window.addEventListener("resize", handleResize);

    let time = 0;

    const animate = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Premium gradient background
      const bgGradient = ctx.createRadialGradient(
        width / 2, height * 0.3, 0,
        width / 2, height * 0.3, width * 0.8
      );
      bgGradient.addColorStop(0, "rgba(248, 250, 252, 1)");
      bgGradient.addColorStop(0.4, "rgba(241, 245, 249, 1)");
      bgGradient.addColorStop(1, "rgba(248, 250, 252, 1)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle dot grid pattern
      ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
      const dotSpacing = 32;
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          const distFromCenter = Math.sqrt(
            Math.pow(x - width / 2, 2) + Math.pow(y - height * 0.35, 2)
          );
          const maxDist = Math.min(width, height) * 0.5;
          const opacity = Math.max(0, 1 - distFromCenter / maxDist) * 0.12;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      const centerX = width / 2;

      // Voice waveform at bottom
      const waveformY = height * 0.85;

      // Draw waveform bars
      waveformBars.forEach((bar, index) => {
        const distFromCenter = Math.abs(bar.x - centerX) / (width / 2);
        const envelope = Math.pow(1 - distFromCenter, 0.5);

        // Multi-frequency wave for natural voice appearance
        const wave1 = Math.sin(time * bar.speed + bar.phase) * 0.6;
        const wave2 = Math.sin(time * bar.speed * 1.7 + bar.phase * 0.8) * 0.3;
        const wave3 = Math.sin(time * bar.speed * 0.5 + bar.phase * 1.2) * 0.1;

        const heightMultiplier = 1 + (wave1 + wave2 + wave3) * envelope;
        const barHeight = bar.baseHeight * heightMultiplier * 3;

        // Color based on position
        const isAccent = index % 4 === 0;
        const color = isAccent ? green : indigo;
        const alpha = 0.2 + envelope * 0.3;

        // Draw bar with gradient
        const barGradient = ctx.createLinearGradient(
          bar.x, waveformY - barHeight,
          bar.x, waveformY + barHeight
        );
        barGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        barGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        barGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 1.2})`);
        barGradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        barGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.fillStyle = barGradient;
        ctx.fillRect(bar.x - 1.5, waveformY - barHeight, 3, barHeight * 2);
      });

      // Add flowing wave line through waveform
      ctx.beginPath();
      ctx.moveTo(0, waveformY);
      for (let x = 0; x <= width; x += 3) {
        const distFromCenter = Math.abs(x - centerX) / (width / 2);
        const envelope = Math.pow(1 - distFromCenter, 0.8);
        const y = waveformY + Math.sin(x * 0.02 + time * 0.03) * 15 * envelope;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vignette effect
      const vignette = ctx.createRadialGradient(
        centerX, height * 0.4, 0,
        centerX, height * 0.4, width * 0.7
      );
      vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
      vignette.addColorStop(0.7, "rgba(255, 255, 255, 0)");
      vignette.addColorStop(1, "rgba(248, 250, 252, 0.5)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
      {/* Seamless edge blending */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
