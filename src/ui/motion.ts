/**
 * Motion primitives over the Web Animations API. Every animation in the UI
 * goes through `play`, so honoring "reduce motion" happens in one place.
 *
 * @module
 */

/** Shared easing curves (mirrored in tokens.css). */
export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.76, 0, 0.24, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Does the visitor ask for less motion? */
export function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Run an animation and resolve when it ends (or is cancelled). */
export function play(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  const calm = reducedMotion();
  const animation = element.animate(keyframes, {
    ...options,
    duration: calm ? 1 : options.duration ?? 300,
    delay: calm ? 0 : options.delay ?? 0,
  });
  return animation.finished.then(() => undefined, () => undefined);
}

/** Resolve after `ms` milliseconds. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Smoothly count a number from `from` to `to`, calling `draw` each frame. */
export function tween(
  from: number,
  to: number,
  duration: number,
  draw: (value: number) => void,
): void {
  if (reducedMotion() || from === to) {
    draw(to);
    return;
  }
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    draw(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
