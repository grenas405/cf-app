/**
 * Magnetic hover: `[data-magnetic]` elements lean toward the cursor and
 * spring home when it leaves. Uses the CSS `translate` property so it never
 * fights the `scale` used by the press effect.
 *
 * @module
 */

import { EASE, reducedMotion } from "../motion.ts";

/** How far toward the pointer an element leans, capped at `max` px. */
export function pull(offset: number, strength = 0.22, max = 10): number {
  return Math.max(-max, Math.min(max, offset * strength));
}

function attach(element: HTMLElement): void {
  element.addEventListener("pointermove", (event) => {
    const box = element.getBoundingClientRect();
    const x = pull(event.clientX - (box.left + box.width / 2));
    const y = pull(event.clientY - (box.top + box.height / 2));
    element.style.translate = `${x}px ${y}px`;
  });
  element.addEventListener("pointerleave", () => {
    const from = element.style.translate || "0px 0px";
    element.style.translate = "";
    element.animate([{ translate: from }, { translate: "0px 0px" }], {
      duration: 700,
      easing: EASE.spring,
    });
  });
}

/** Wire every magnetic element, on devices with a precise pointer. */
export function installMagnetic(root: Document): void {
  if (!matchMedia("(pointer: fine)").matches || reducedMotion()) return;
  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach(attach);
}
