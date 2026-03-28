/** Short confetti burst for rematch transition (skipped when reduced motion). */

export async function fireRematchTransitionConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    const count = 90;
    const defaults = {
      origin: { y: 0.72 },
      colors: ["#ff6600", "#f59e0b", "#eab308", "#22c55e", "#00b2ff"],
    };
    function fire(particleRatio: number, opts: Record<string, unknown>) {
      void confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  } catch {
    /* optional dependency path */
  }
}
