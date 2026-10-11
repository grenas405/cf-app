/**
 * Everything driven by scroll position: reveal-on-enter, the progress bar,
 * the condensed top bar, and which section is "current".
 *
 * @module
 */

import { all } from "../dom.ts";

/** Fraction of the page scrolled, clamped to 0..1. */
export function scrollFraction(
  scrollTop: number,
  scrollHeight: number,
  viewport: number,
): number {
  const range = scrollHeight - viewport;
  return range <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / range));
}

/** Fade elements in as they enter the viewport, staggering groups. */
export function installReveal(root: Document): void {
  for (const group of all("[data-reveal-group]", root)) {
    all("[data-reveal]", group).forEach((child, i) =>
      child.style.setProperty("--i", String(i))
    );
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  all("[data-reveal]", root).forEach((element) => observer.observe(element));
}

/** Keep the progress bar and top bar in step with scrolling. */
export function installScrollChrome(
  bar: HTMLElement,
  topbar: HTMLElement,
): void {
  let queued = false;
  const update = (): void => {
    queued = false;
    const doc = document.documentElement;
    const fraction = scrollFraction(
      doc.scrollTop,
      doc.scrollHeight,
      innerHeight,
    );
    bar.style.transform = `scaleX(${fraction})`;
    topbar.classList.toggle("is-scrolled", doc.scrollTop > 12);
  };
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

/** Report the section crossing the middle of the screen. */
export function installSectionTracking(
  root: Document,
  onChange: (id: string, label: string) => void,
): void {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const section = entry.target as HTMLElement;
      onChange(section.id, section.dataset["section"] ?? section.id);
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  all("[data-section]", root).forEach((section) => observer.observe(section));
}
