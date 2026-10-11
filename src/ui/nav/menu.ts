/**
 * The cinematic menu.
 *
 *   open:   three colored curtains bloom from the toggle in a staggered
 *           circle, then each title rises letter by letter.
 *   choose: letters fall away, the page jumps behind the curtain, and the
 *           curtains wipe upward to reveal the new scene.
 *   close:  curtains collapse back into the toggle.
 *
 * Accessible throughout: real links, focus trap, Escape, inert background.
 *
 * @module
 */

import { all, h } from "../dom.ts";
import { EASE, play } from "../motion.ts";
import {
  circleClip,
  type Curtain,
  curtainFrom,
  letterDelay,
  letterExitDelay,
  splitLabel,
} from "./choreography.ts";

/** What the rest of the page can ask of the menu. */
export interface Menu {
  readonly setCurrent: (sectionId: string) => void;
}

type State = "closed" | "opening" | "open" | "closing";

/** Replace each title with per-letter spans, keeping an accessible label. */
function splitLinks(links: readonly HTMLAnchorElement[]): HTMLElement[][] {
  return links.map((link) => {
    const text = link.querySelector<HTMLElement>(".menu__text");
    const num = link.querySelector<HTMLElement>(".menu__num");
    if (text === null) return [];
    const label = text.textContent ?? "";
    link.setAttribute("aria-label", label);
    num?.setAttribute("aria-hidden", "true");
    const chars = splitLabel(label).map((char, i) => {
      const span = h("span", { class: "menu__char", "aria-hidden": "true" }, [
        char,
      ]);
      span.style.setProperty("--ci", String(i));
      return span;
    });
    text.replaceChildren(...chars);
    return chars;
  });
}

function curtainAt(toggle: HTMLElement): Curtain {
  const box = toggle.getBoundingClientRect();
  return curtainFrom(
    box.left + box.width / 2,
    box.top + box.height / 2,
    innerWidth,
    innerHeight,
  );
}

/** Install the menu and return its small public interface. */
export function installMenu(
  toggle: HTMLButtonElement,
  menu: HTMLElement,
): Menu {
  const links = all<HTMLAnchorElement>(".menu__link", menu);
  const panels = all(".menu__panel", menu);
  const scene = all(".menu__inner, .menu__glow", menu);
  const aside = menu.querySelector<HTMLElement>(".menu__aside");
  const blurb = menu.querySelector<HTMLElement>("#menu-blurb");
  const label = toggle.querySelector<HTMLElement>(".menu-toggle__label");
  const chars = splitLinks(links);
  const backdrop = all("main, footer");
  let state: State = "closed";

  const setLabel = (open: boolean): void => {
    if (label === null) return;
    label.textContent =
      (open ? label.dataset["close"] : label.dataset["open"]) ?? "";
    void play(label, [
      { transform: "translateY(100%)", opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 450, easing: EASE.out });
  };

  const lockPage = (locked: boolean): void => {
    document.documentElement.classList.toggle("is-locked", locked);
    document.documentElement.classList.toggle("menu-open", locked);
    backdrop.forEach((element) => element.toggleAttribute("inert", locked));
  };

  const lettersIn = (): Promise<void>[] =>
    chars.flatMap((letters, li) =>
      letters.map((char, ci) =>
        play(char, [
          { translate: "0 115%", rotate: "10deg", opacity: 0 },
          { translate: "0 0", rotate: "0deg", opacity: 1 },
        ], {
          duration: 950,
          delay: letterDelay(li, ci),
          easing: EASE.out,
          fill: "both",
        })
      )
    );

  const lettersOut = (): Promise<void>[] =>
    chars.flatMap((letters, li) =>
      letters.map((char, ci) =>
        play(char, [
          { translate: "0 0", opacity: 1 },
          { translate: "0 -115%", opacity: 0 },
        ], {
          duration: 420,
          delay: letterExitDelay(li, ci),
          easing: EASE.inOut,
          fill: "forwards",
        })
      )
    );

  const extrasIn = (): Promise<void>[] => [
    ...links.map((link, i) =>
      play(link, [{ "--line": "0" }, { "--line": "1" }], {
        duration: 900,
        delay: 500 + i * 55,
        easing: EASE.out,
        fill: "both",
      })
    ),
    ...(aside === null ? [] : [play(aside, [
      { opacity: 0, transform: "translateY(30px)" },
      { opacity: 1, transform: "none" },
    ], { duration: 900, delay: 620, easing: EASE.out, fill: "both" })]),
  ];

  const open = async (): Promise<void> => {
    state = "opening";
    toggle.setAttribute("aria-expanded", "true");
    setLabel(true);
    lockPage(true);
    menu.hidden = false;
    const curtain = curtainAt(toggle);
    const last = panels.length - 1;
    const blooms = [...panels, ...scene].map((layer, i) =>
      play(layer, [
        { clipPath: circleClip(curtain, 0) },
        { clipPath: circleClip(curtain, curtain.radius) },
      ], {
        duration: 1000,
        delay: Math.min(i, last) * 120,
        easing: EASE.inOut,
        fill: "both",
      })
    );
    menu.classList.add("is-open");
    const current = links.find((link) => link.classList.contains("is-current"));
    (current ?? links[0])?.focus({ preventScroll: true });
    await Promise.all([...blooms, ...lettersIn(), ...extrasIn()]);
    state = "open";
  };

  const finish = (): void => {
    menu.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    menu.hidden = true;
    menu.classList.remove("is-open");
    lockPage(false);
    toggle.setAttribute("aria-expanded", "false");
    state = "closed";
  };

  const close = async (): Promise<void> => {
    state = "closing";
    toggle.setAttribute("aria-expanded", "false");
    setLabel(false);
    const curtain = curtainAt(toggle);
    await Promise.all(lettersOut());
    await Promise.all(
      [...scene, ...[...panels].reverse()].map((layer, i) =>
        play(layer, [
          { clipPath: circleClip(curtain, curtain.radius) },
          { clipPath: circleClip(curtain, 0) },
        ], {
          duration: 750,
          delay: Math.max(0, i - scene.length + 1) * 90,
          easing: EASE.inOut,
          fill: "forwards",
        })
      ),
    );
    finish();
    toggle.focus({ preventScroll: true });
  };

  const cutTo = async (id: string): Promise<void> => {
    const target = document.getElementById(id);
    state = "closing";
    toggle.setAttribute("aria-expanded", "false");
    setLabel(false);
    await Promise.all(lettersOut());
    target?.scrollIntoView({ behavior: "instant", block: "start" });
    history.pushState(null, "", `#${id}`);
    await Promise.all(
      [...scene, ...[...panels].reverse()].map((layer, i) =>
        play(layer, [
          { clipPath: "inset(0 0 0 0)" },
          { clipPath: "inset(0 0 100% 0)" },
        ], {
          duration: 900,
          delay: Math.max(0, i - scene.length + 1) * 110,
          easing: EASE.inOut,
          fill: "forwards",
        })
      ),
    );
    finish();
    const heading = target?.querySelector<HTMLElement>("h1, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  };

  toggle.addEventListener("click", () => {
    if (state === "closed") void open();
    else if (state === "open") void close();
  });

  for (const link of links) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (state !== "open" && state !== "opening") return;
      void cutTo(link.hash.slice(1));
    });
    const describe = (): void => {
      if (blurb === null) return;
      blurb.textContent = link.dataset["blurb"] ?? "";
      void play(blurb, [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ], { duration: 400, easing: EASE.out });
    };
    link.addEventListener("pointerenter", describe);
    link.addEventListener("focus", describe);
  }

  menu.addEventListener("pointermove", (event) => {
    menu.style.setProperty("--mx", `${event.clientX}px`);
    menu.style.setProperty("--my", `${event.clientY}px`);
  });

  document.addEventListener("keydown", (event) => {
    if (state !== "open") return;
    if (event.key === "Escape") {
      event.preventDefault();
      void close();
      return;
    }
    if (event.key !== "Tab") return;
    const stops: HTMLElement[] = [toggle, ...links];
    const at = stops.indexOf(document.activeElement as HTMLElement);
    const next = (at + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
    event.preventDefault();
    stops[next]?.focus();
  });

  return {
    setCurrent: (sectionId) => {
      for (const link of links) {
        link.classList.toggle("is-current", link.hash === `#${sectionId}`);
      }
    },
  };
}
