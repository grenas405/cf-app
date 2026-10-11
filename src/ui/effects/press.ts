/**
 * Button press choreography, installed once with event delegation:
 *
 *   pointerdown -> ripple from the finger + spring "squish"
 *   release     -> overshoot back to size
 *   click       -> particle burst + shockwave (on `.btn--burst`)
 *
 * Plus `setButtonState` for loading, success and error feedback.
 *
 * @module
 */

import { h, svg } from "../dom.ts";
import { EASE, play, reducedMotion } from "../motion.ts";

/** A particle's flight: where it goes and how it turns. */
export interface Spark {
  readonly dx: number;
  readonly dy: number;
  readonly spin: number;
  readonly delay: number;
}

/** Evenly fanned sparks with a little rhythm. Deterministic, so testable. */
export function burstVectors(count: number, radius: number): Spark[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.18;
    const reach = radius * (0.65 + (i % 3) * 0.22);
    return {
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      spin: (i % 2 === 0 ? 1 : -1) * (120 + i * 15),
      delay: (i % 4) * 18,
    };
  });
}

function buttonFrom(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(".btn") : null;
}

function fxLayer(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".fx-layer");
  if (existing !== null) return existing;
  const layer = h("div", { class: "fx-layer", "aria-hidden": "true" });
  document.body.append(layer);
  return layer;
}

/** A soft light that blooms from the press point inside the button. */
export function ripple(button: HTMLElement, x: number, y: number): void {
  if (reducedMotion()) return;
  const box = button.getBoundingClientRect();
  const size = Math.hypot(box.width, box.height) * 2;
  const dot = h("span", { class: "ripple" });
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.left = `${x - box.left - size / 2}px`;
  dot.style.top = `${y - box.top - size / 2}px`;
  button.append(dot);
  void play(dot, [
    { transform: "scale(0)", opacity: 1 },
    { transform: "scale(1)", opacity: 0 },
  ], { duration: 750, easing: EASE.out }).then(() => dot.remove());
}

/** Compress on press, then spring back past full size on release. */
export function squish(button: HTMLElement): void {
  if (reducedMotion()) return;
  const press = button.animate([{ scale: "1" }, { scale: "0.95" }], {
    duration: 120,
    easing: "ease-out",
    fill: "forwards",
  });
  const done = new AbortController();
  const release = (): void => {
    done.abort();
    button.animate([{ scale: "0.95" }, { scale: "1.04" }, { scale: "1" }], {
      duration: 560,
      easing: EASE.out,
    });
    press.cancel();
  };
  addEventListener("pointerup", release, { signal: done.signal });
  addEventListener("pointercancel", release, { signal: done.signal });
}

/** Sparks and a shockwave ring that fly out from (x, y). */
export function burst(x: number, y: number): void {
  if (reducedMotion()) return;
  const layer = fxLayer();
  const shock = h("span", { class: "shock" });
  shock.style.left = `${x}px`;
  shock.style.top = `${y}px`;
  const sparks = burstVectors(14, 90).map((spark) => {
    const dot = h("span", { class: "spark" });
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    return { dot, spark };
  });
  const group = h("div", {}, [shock, ...sparks.map((s) => s.dot)]);
  layer.append(group);

  const flights = sparks.map(({ dot, spark }) =>
    play(dot, [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      {
        transform:
          `translate(${spark.dx}px, ${spark.dy}px) scale(0) rotate(${spark.spin}deg)`,
        opacity: 0,
      },
    ], { duration: 720, delay: spark.delay, easing: EASE.out })
  );
  const ring = play(shock, [
    { transform: "scale(0.4)", opacity: 1, borderWidth: "3px" },
    { transform: "scale(9)", opacity: 0, borderWidth: "0.5px" },
  ], { duration: 650, easing: EASE.out });
  void Promise.all([...flights, ring]).then(() => group.remove());
}

/** Center of an element in viewport coordinates. */
function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function onPointerDown(event: PointerEvent): void {
  const button = buttonFrom(event.target);
  if (button === null || event.button !== 0) return;
  ripple(button, event.clientX, event.clientY);
  squish(button);
}

function onClick(event: MouseEvent): void {
  const button = buttonFrom(event.target);
  if (button === null || !button.classList.contains("btn--burst")) return;
  const fromKeyboard = event.detail === 0;
  const point = fromKeyboard
    ? centerOf(button)
    : { x: event.clientX, y: event.clientY };
  burst(point.x, point.y);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = buttonFrom(event.target);
  if (button === null || event.repeat) return;
  const { x, y } = centerOf(button);
  ripple(button, x, y);
}

/** Wire every `.btn` on the page, now and in the future. */
export function installPressEffects(root: Document): void {
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
}

/** The states a button can show. */
export type ButtonState = "idle" | "loading" | "success" | "error";

function ensureStatus(button: HTMLElement): void {
  if (button.querySelector(".btn__status") !== null) return;
  const mark = (kind: string, d: string): SVGSVGElement =>
    svg(
      "svg",
      { class: `btn__mark btn__mark--${kind}`, viewBox: "0 0 24 24" },
      [
        svg("path", { d }),
      ],
    );
  button.append(h("span", { class: "btn__status", "aria-hidden": "true" }, [
    h("span", { class: "btn__spinner" }),
    mark("ok", "M5 12.5l4.5 4.5L19 7.5"),
    mark("err", "M7 7l10 10M17 7L7 17"),
  ]));
}

/** Show loading, success or error on a button (or return it to idle). */
export function setButtonState(button: HTMLElement, state: ButtonState): void {
  ensureStatus(button);
  if (state === "idle") button.removeAttribute("data-state");
  else button.setAttribute("data-state", state);
  button.toggleAttribute("aria-busy", state === "loading");
  if (button instanceof HTMLButtonElement) {
    button.disabled = state === "loading";
  }
}

/** Show a final state briefly, then return to idle. */
export function flashButtonState(
  button: HTMLElement,
  state: "success" | "error",
  ms = 1400,
): void {
  setButtonState(button, state);
  setTimeout(() => setButtonState(button, "idle"), ms);
}
