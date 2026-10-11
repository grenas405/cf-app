/**
 * The three stack cards: a 3D tilt that follows the pointer, and a tap that
 * unfolds a live excerpt of the file each tool is responsible for.
 *
 * @module
 */

import type { Catalog } from "../anatomy/catalog.ts";
import { entriesOf } from "../anatomy/catalog.ts";
import { codeRows } from "../anatomy/code.ts";
import { all, h } from "../dom.ts";
import { reducedMotion } from "../motion.ts";

/** Tilt angles for a pointer position within a box. Pure. */
export function tiltFor(
  x: number,
  y: number,
  width: number,
  height: number,
  max = 7,
): { rx: number; ry: number } {
  const nx = width === 0 ? 0 : x / width - 0.5;
  const ny = height === 0 ? 0 : y / height - 0.5;
  return { rx: -ny * max * 2, ry: nx * max * 2 };
}

function attachTilt(card: HTMLElement): void {
  card.addEventListener("pointermove", (event) => {
    const box = card.getBoundingClientRect();
    const { rx, ry } = tiltFor(
      event.clientX - box.left,
      event.clientY - box.top,
      box.width,
      box.height,
    );
    card.style.setProperty("--rx", `${rx}deg`);
    card.style.setProperty("--ry", `${ry}deg`);
    card.style.setProperty("--gx", `${event.clientX - box.left}px`);
    card.style.setProperty("--gy", `${event.clientY - box.top}px`);
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

/** Wire tilt and expand/collapse on every stack card. */
export function installCards(catalog: Promise<Catalog | null>): void {
  for (const card of all("[data-tilt]")) {
    if (matchMedia("(pointer: fine)").matches && !reducedMotion()) {
      attachTilt(card);
    }
    const more = card.querySelector<HTMLElement>(".card__more");
    const toggle = async (): Promise<void> => {
      const open = card.getAttribute("aria-expanded") !== "true";
      card.setAttribute("aria-expanded", String(open));
      if (!open || more === null || more.childElementCount > 0) return;
      const entry = entriesOf(
        await catalog ??
          { modules: [], documents: [], rules: [], generatedBy: "" },
      )
        .find((e) => e.path === card.dataset["cardFile"]);
      if (entry === undefined) return;
      more.replaceChildren(h("div", {}, [
        h(
          "pre",
          { class: "excerpt" },
          codeRows(entry.path, entry.source, { to: 40 }),
        ),
      ]));
    };
    card.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest(".excerpt")) {
        return;
      }
      void toggle();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void toggle();
    });
  }
}
